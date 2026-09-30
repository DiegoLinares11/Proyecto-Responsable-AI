// ===========================================================================
// Señal 3 — Corroboración independiente
//
// Se buscan las palabras clave del titular en medios externos y se cuenta
// cuántos DOMINIOS DISTINTOS cubren el mismo hecho.
//
// Tres reglas que hacen que el conteo signifique algo:
//
//   · Se cuenta por dominio, no por artículo. Veinte réplicas de un mismo cable
//     de agencia no son veinte confirmaciones.
//
//   · El dominio de la propia noticia no cuenta. Un medio no se corrobora a sí
//     mismo, y sin esta regla cualquier nota tendría una confirmación gratis.
//
//   · Los medios del registro con buena credibilidad aportan más. Es el mismo
//     criterio periodístico de siempre: dos medios serios cubriendo lo mismo
//     pesa más que cinco agregadores.
// ===========================================================================

import {
  CREDIBILIDAD_BUEN_NIVEL,
  MAXIMOS,
  type BuscarCobertura,
  type BuscarFuente,
  type NoticiaAValidar,
  type ResultadoSenal,
} from "../tipos.ts";
import { candidatosDeDominio, dominioBase } from "../dominio.ts";
import { palabrasClave } from "../texto.ts";
import { recortar, redondear } from "../numeros.ts";

const MAXIMO = MAXIMOS.corroboracion;

/** Puntos por cada dominio distinto que cubre el hecho. */
const POR_DOMINIO = 8;
/** Puntos extra por cada dominio que además es de buen nivel. */
const EXTRA_POR_BUEN_NIVEL = 4;

export async function evaluarCorroboracion(
  noticia: NoticiaAValidar,
  buscarCobertura: BuscarCobertura,
  buscarFuente: BuscarFuente,
): Promise<ResultadoSenal> {
  const base = { senal: "corroboracion", maximo: MAXIMO, veto: false } as const;

  const terminos = palabrasClave(noticia.titulo);

  if (terminos.length < 2) {
    return {
      ...base,
      aporte: 0,
      disponible: false,
      detalle: {
        resultado: "titular_sin_terminos_buscables",
        terminos,
        explicacion:
          "Del titular no salieron suficientes términos distintivos para buscar el hecho en otros " +
          "medios. No se pudo corroborar, así que pasa a revisión humana.",
      },
    };
  }

  const consulta = terminos.join(" ");

  let articulos;
  try {
    articulos = await buscarCobertura({ terminos, titulo: noticia.titulo });
  } catch (error) {
    return {
      ...base,
      aporte: 0,
      disponible: false,
      detalle: {
        resultado: "buscador_no_disponible",
        consulta,
        error: error instanceof Error ? error.message : String(error),
        explicacion:
          "La búsqueda de cobertura externa falló. Nunca se da por corroborada una noticia por " +
          "falta de datos: queda en revisión humana.",
      },
    };
  }

  const propio = noticia.urlOriginal === null ? null : dominioBase(noticia.urlOriginal);

  const ajenos = new Map<string, string[]>();
  for (const articulo of articulos) {
    const dominio = candidatosDeDominio(articulo.dominio.toLowerCase()).at(-1);
    if (dominio === undefined) continue;
    if (propio !== null && dominio === propio) continue;

    const titulos = ajenos.get(dominio) ?? [];
    titulos.push(articulo.titulo);
    ajenos.set(dominio, titulos);
  }

  const dominios = [...ajenos.keys()].sort();

  // Cuáles de los que corroboran son medios que el registro considera serios.
  const deBuenNivel: string[] = [];
  for (const dominio of dominios) {
    const fuente = await buscarFuente(candidatosDeDominio(dominio));
    if (fuente !== null && fuente.puntajeCredibilidad >= CREDIBILIDAD_BUEN_NIVEL) {
      deBuenNivel.push(dominio);
    }
  }

  const aporte = recortar(
    dominios.length * POR_DOMINIO + deBuenNivel.length * EXTRA_POR_BUEN_NIVEL,
    0,
    MAXIMO,
  );

  return {
    ...base,
    aporte: redondear(aporte),
    disponible: true,
    detalle: {
      resultado:
        dominios.length === 0
          ? "sin_corroboracion"
          : dominios.length === 1
            ? "corroboracion_debil"
            : "corroborada",
      consulta,
      terminos,
      ...(propio !== null ? { dominio_propio_excluido: propio } : {}),
      dominios_que_corroboran: dominios,
      dominios_de_buen_nivel: deBuenNivel,
      articulos_encontrados: articulos.length,
      explicacion:
        dominios.length === 0
          ? `Ningún otro medio aparece cubriendo este hecho al buscar «${consulta}».`
          : `${dominios.length} ${dominios.length === 1 ? "medio independiente cubre" : "medios independientes cubren"} ` +
            `el mismo hecho${deBuenNivel.length > 0 ? `, ${deBuenNivel.length} de ellos con buena credibilidad en el registro` : ""}. ` +
            "El conteo es por dominio, no por artículo, para que las réplicas de un mismo cable no cuenten varias veces.",
    },
  };
}
