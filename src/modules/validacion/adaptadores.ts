// ===========================================================================
// Adaptadores — la única parte que habla con el exterior
//
// Las dos APIs externas son gratuitas, y esa fue la condición para elegirlas
// (docs/presupuesto.md):
//
//   · GDELT DOC 2.0 — sin llave, sin registro, cobertura mundial.
//   · Google Fact Check Tools — llave gratuita, cuota generosa.
//
// Todo lo que puede fallar se traduce a una excepción, porque las señales
// distinguen «averigüé que está mal» de «no pude averiguar» y el segundo caso
// tiene que llegar como excepción para que la noticia acabe en moderación en
// vez de darse por buena.
// ===========================================================================

import type {
  ArticuloExterno,
  BuscarCobertura,
  BuscarDesmentidos,
  BuscarFuente,
  Desmentido,
  FuenteRegistrada,
} from "./tipos.ts";

const TIEMPO_LIMITE_MS = 10_000;

// ---------------------------------------------------------------------------
// GDELT — corroboración
// ---------------------------------------------------------------------------

type ArticuloGdelt = {
  url?: unknown;
  title?: unknown;
  domain?: unknown;
  language?: unknown;
};

export type OpcionesGdelt = {
  /** Ventana de búsqueda. Un hecho se cubre en días, no en meses. */
  ventana?: string;
  maximoDeArticulos?: number;
  buscar?: typeof fetch;
};

export function crearBuscadorDeCobertura(opciones: OpcionesGdelt = {}): BuscarCobertura {
  const ventana = opciones.ventana ?? "7d";
  const maximo = opciones.maximoDeArticulos ?? 50;
  const buscar = opciones.buscar ?? fetch;

  return async function buscarCobertura(consulta: string): Promise<ArticuloExterno[]> {
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.searchParams.set("query", consulta);
    url.searchParams.set("mode", "artlist");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxrecords", String(maximo));
    url.searchParams.set("timespan", ventana);

    const respuesta = await buscar(url, {
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      headers: { accept: "application/json" },
    });

    if (!respuesta.ok) {
      throw new Error(`GDELT respondió ${respuesta.status}`);
    }

    // GDELT devuelve texto plano cuando la consulta no le gusta, con un 200.
    const texto = await respuesta.text();
    let cuerpo: { articles?: unknown };
    try {
      cuerpo = JSON.parse(texto) as { articles?: unknown };
    } catch {
      throw new Error(`GDELT devolvió una respuesta que no es JSON: ${texto.slice(0, 120)}`);
    }

    if (!Array.isArray(cuerpo.articles)) return [];

    const articulos: ArticuloExterno[] = [];
    for (const crudo of cuerpo.articles as ArticuloGdelt[]) {
      const url = typeof crudo.url === "string" ? crudo.url : null;
      const dominio = typeof crudo.domain === "string" ? crudo.domain : null;
      const titulo = typeof crudo.title === "string" ? crudo.title : "";
      if (url === null || dominio === null) continue;
      articulos.push({ url, dominio, titulo });
    }
    return articulos;
  };
}

// ---------------------------------------------------------------------------
// Google Fact Check Tools — desmentidos
// ---------------------------------------------------------------------------

type RevisionGoogle = {
  publisher?: { name?: unknown; site?: unknown };
  url?: unknown;
  textualRating?: unknown;
};

type AfirmacionGoogle = {
  text?: unknown;
  claimReview?: unknown;
};

/**
 * Devuelve `null` si no hay llave configurada. Esa distinción importa: sin
 * verificador, y salvo que se configure lo contrario, ninguna noticia llega
 * sola a `verificada`.
 */
export function crearBuscadorDeDesmentidos(
  llave: string | undefined,
  buscar: typeof fetch = fetch,
): BuscarDesmentidos {
  if (llave === undefined || llave.trim() === "") return null;

  return async function buscarDesmentidos(consulta: string): Promise<Desmentido[]> {
    const url = new URL("https://factchecktools.googleapis.com/v1alpha1/claims:search");
    url.searchParams.set("key", llave);
    url.searchParams.set("query", consulta);
    url.searchParams.set("languageCode", "es");
    url.searchParams.set("pageSize", "10");

    const respuesta = await buscar(url, {
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      headers: { accept: "application/json" },
    });

    if (!respuesta.ok) {
      throw new Error(`Fact Check Tools respondió ${respuesta.status}`);
    }

    const cuerpo = (await respuesta.json()) as { claims?: unknown };
    if (!Array.isArray(cuerpo.claims)) return [];

    const encontrados: Desmentido[] = [];
    for (const afirmacion of cuerpo.claims as AfirmacionGoogle[]) {
      const texto = typeof afirmacion.text === "string" ? afirmacion.text : "";
      const revisiones = Array.isArray(afirmacion.claimReview)
        ? (afirmacion.claimReview as RevisionGoogle[])
        : [];

      for (const revision of revisiones) {
        const calificacion =
          typeof revision.textualRating === "string" ? revision.textualRating : "";
        if (calificacion === "") continue;

        encontrados.push({
          afirmacion: texto,
          editor:
            typeof revision.publisher?.name === "string"
              ? revision.publisher.name
              : typeof revision.publisher?.site === "string"
                ? revision.publisher.site
                : "desconocido",
          calificacion,
          url: typeof revision.url === "string" ? revision.url : "",
        });
      }
    }
    return encontrados;
  };
}

// ---------------------------------------------------------------------------
// Registro de fuentes
//
// El puerto recibe una función que consulta la base. Así el módulo de
// validación no depende del cliente de Supabase: la conexión se arma donde se
// arma la ruta, y este código se puede probar sin base de datos.
// ---------------------------------------------------------------------------

export type ConsultarFuentes = (dominios: string[]) => Promise<FuenteRegistrada[]>;

/**
 * Envuelve la consulta con dos cosas: respeta el orden de los candidatos (el
 * más específico gana) y recuerda lo ya preguntado, porque la señal de
 * corroboración consulta el registro una vez por medio que corrobora y muchos
 * se repiten entre noticias de la misma tanda.
 */
export function crearBuscadorDeFuentes(consultar: ConsultarFuentes): BuscarFuente {
  const memoria = new Map<string, FuenteRegistrada | null>();

  return async function buscarFuente(candidatos: string[]): Promise<FuenteRegistrada | null> {
    if (candidatos.length === 0) return null;

    const porConsultar = candidatos.filter((c) => !memoria.has(c));

    if (porConsultar.length > 0) {
      const halladas = await consultar(porConsultar);
      const porDominio = new Map(halladas.map((f) => [f.dominio, f]));
      for (const candidato of porConsultar) {
        memoria.set(candidato, porDominio.get(candidato) ?? null);
      }
    }

    // El orden de `candidatos` va del más específico al más general.
    for (const candidato of candidatos) {
      const fuente = memoria.get(candidato);
      if (fuente !== undefined && fuente !== null) return fuente;
    }
    return null;
  };
}
