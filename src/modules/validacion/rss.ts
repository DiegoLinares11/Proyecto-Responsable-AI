// ===========================================================================
// Corroboración contra los feeds que publican los medios del registro
//
// Segundo proveedor de la señal 3. Cada medio publica un RSS para ser
// sindicado: leerlo es el uso para el que existe, y ese permiso explícito fue
// la razón de elegirlo sobre alternativas de más cobertura pero términos
// restrictivos (ver la migración 20260930140000 y docs/validacion-noticias.md).
//
// Tiene un límite que conviene decir en voz alta: solo corrobora contra los
// medios que están en el registro. Si un hecho lo cubre un medio que nadie
// agregó a `fuentes`, esta vía no lo ve. A cambio, cada corroboración viene de
// una fuente cuya credibilidad el equipo ya evaluó y escribió.
//
// El parseo es con expresiones regulares, igual que el de metadatos y por la
// misma razón: hacen falta dos campos por entrada, no un árbol XML. Un feed mal
// formado produce menos entradas, nunca una excepción.
// ===========================================================================

import type { ArticuloExterno, BuscarCobertura, ConsultaDeCobertura } from "./tipos.ts";
import { similitudDeTitulos, tokens } from "./texto.ts";

export type ItemDeFeed = {
  titulo: string;
  enlace: string;
};

/** Un medio del registro que publica feed. */
export type FuenteConFeed = {
  dominio: string;
  urlRss: string;
};

export type ListarFuentesConFeed = () => Promise<FuenteConFeed[]>;

const NOMBRADAS: Readonly<Record<string, string>> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
};

function quitarCdata(texto: string): string {
  return (
    texto
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      // Las entidades numéricas son habituales en los feeds en español:
      // `Ar&#233;valo`. Sin decodificarlas, el título no coincide con nada.
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
      .replace(/&(?:lt|gt|quot|apos|nbsp);/g, (e) => NOMBRADAS[e] ?? e)
      // `&amp;` al final, para que `&amp;#233;` no se convierta en `&#233;` y
      // luego en una letra que el feed no decía.
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Entradas de un feed, sea RSS (`<item>`) o Atom (`<entry>`). */
export function leerItemsDeFeed(xml: string): ItemDeFeed[] {
  const bloques = [
    ...[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => m[1] ?? ""),
    ...[...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map((m) => m[1] ?? ""),
  ];

  const items: ItemDeFeed[] = [];

  for (const bloque of bloques) {
    const tituloCrudo = bloque.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    if (tituloCrudo === undefined) continue;

    const titulo = quitarCdata(tituloCrudo);
    if (titulo === "") continue;

    // RSS trae el enlace como texto; Atom como atributo href.
    const enlaceTexto = bloque.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    const enlaceAtributo = bloque.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
    const enlace = quitarCdata(enlaceAtributo ?? enlaceTexto ?? "");

    items.push({ titulo, enlace });
  }

  return items;
}

/**
 * Cuántos términos de la consulta aparecen en el título de la entrada.
 *
 * Se compara sobre palabras normalizadas y completas, no por subcadena: buscar
 * «paro» no debe coincidir con «comparo».
 */
export function terminosCoincidentes(consulta: string, titulo: string): string[] {
  const buscados = new Set(tokens(consulta));
  const delTitulo = new Set(tokens(titulo));
  return [...buscados].filter((t) => delTitulo.has(t));
}

export type OpcionesFeeds = {
  listarFuentes: ListarFuentesConFeed;
  buscar?: typeof fetch;
  tiempoLimiteMs?: number;
  /**
   * Cuánto se tienen que parecer dos titulares para considerar que cubren el
   * mismo hecho, de 0 a 1.
   *
   * Calibrado contra feeds reales. Dos medios cubriendo el mismo hecho:
   *
   *   «Jenny Alvarado Teni presidirá la CSJ con retos de credibilidad…»  (PL)
   *   «Jenny Alvarado por próximo proceso electoral: Estamos consientes…» (La Hora)
   *
   * comparten apenas tres palabras significativas y dan un parecido de 0.33.
   * Dos titulares de temas distintos del mismo feed se quedan por debajo de
   * 0.15. El umbral va en medio, más cerca del piso.
   */
  parecidoMinimo?: number;
  /**
   * Además del parecido, al menos esta cantidad de palabras significativas en
   * común. Evita que dos titulares muy cortos den un parecido alto por
   * casualidad.
   */
  minimoDePalabrasComunes?: number;
  /** Los feeds cambian lento; validar una tanda no debe redescargarlos. */
  vidaDeCacheMs?: number;
  ahora?: () => number;
};

export function crearBuscadorEnFeeds(opciones: OpcionesFeeds): BuscarCobertura {
  const buscar = opciones.buscar ?? fetch;
  const tiempoLimiteMs = opciones.tiempoLimiteMs ?? 12_000;
  const vidaDeCacheMs = opciones.vidaDeCacheMs ?? 5 * 60_000;
  const ahora = opciones.ahora ?? Date.now;

  const cache = new Map<string, { expira: number; items: ItemDeFeed[] }>();

  async function traerFeed(url: string): Promise<ItemDeFeed[]> {
    const guardado = cache.get(url);
    if (guardado !== undefined && guardado.expira > ahora()) return guardado.items;

    const respuesta = await buscar(url, {
      signal: AbortSignal.timeout(tiempoLimiteMs),
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}`);

    const items = leerItemsDeFeed(await respuesta.text());
    cache.set(url, { expira: ahora() + vidaDeCacheMs, items });
    return items;
  }

  return async function buscarCobertura(
    consulta: ConsultaDeCobertura,
  ): Promise<ArticuloExterno[]> {
    const fuentes = await opciones.listarFuentes();

    if (fuentes.length === 0) {
      throw new Error("Ningún medio del registro tiene feed configurado");
    }

    const parecidoMinimo = opciones.parecidoMinimo ?? 0.25;
    const minimoDePalabrasComunes = opciones.minimoDePalabrasComunes ?? 2;

    const resultados = await Promise.allSettled(
      fuentes.map(async (fuente) => ({ fuente, items: await traerFeed(fuente.urlRss) })),
    );

    const fallos = resultados.filter((r) => r.status === "rejected");

    // Que fallen todos significa que no se pudo averiguar, y esa es la
    // condición que deja la noticia sin corroborar. Que falle alguno no: lo que
    // sí se pudo leer sigue siendo información.
    if (fallos.length === fuentes.length) {
      const motivos = fallos
        .map((f) => (f as PromiseRejectedResult).reason)
        .map((r) => (r instanceof Error ? r.message : String(r)))
        .slice(0, 3)
        .join(" | ");
      throw new Error(`Ningún feed del registro respondió. ${motivos}`);
    }

    const articulos: ArticuloExterno[] = [];

    for (const resultado of resultados) {
      if (resultado.status !== "fulfilled") continue;
      const { fuente, items } = resultado.value;

      for (const item of items) {
        const comunes = terminosCoincidentes(consulta.titulo, item.titulo);
        if (comunes.length < minimoDePalabrasComunes) continue;
        if (similitudDeTitulos(consulta.titulo, item.titulo) < parecidoMinimo) continue;

        articulos.push({
          url: item.enlace,
          // El dominio del medio dueño del feed, no el del enlace. La pregunta
          // de la señal es «¿este medio cubre el hecho?», y algunos feeds
          // enlazan a dominios de terceros (acortadores, CDNs) que
          // distorsionarían el conteo de medios independientes.
          dominio: fuente.dominio,
          titulo: item.titulo,
        });
      }
    }

    return articulos;
  };
}
