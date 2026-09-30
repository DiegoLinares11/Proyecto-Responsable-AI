// ===========================================================================
// Señal 2 — La URL existe y dice lo que dice
//
// Se descarga la página, se comprueba que responda, se leen sus metadatos y se
// compara el titular enviado contra el real.
//
// Atrapa dos cosas distintas y conviene no confundirlas:
//
//   · Enlaces inventados. La URL no existe, devuelve 404, o el dominio no
//     resuelve.
//   · Titulares tergiversados. La URL existe, pero el titular que se publicó
//     exagera o dice otra cosa que el artículo original.
//
// Y una tercera que NO es un hallazgo: que la red se haya caído. Ahí no sabemos
// nada, y esa diferencia decide si la noticia puede llegar a `verificada`.
// Un 404 es información; un timeout es ignorancia.
// ===========================================================================

import {
  MAXIMOS,
  type NoticiaAValidar,
  type ResultadoSenal,
  type TraerUrl,
} from "../tipos.ts";
import { leerMetadatos } from "../metadatos.ts";
import { similitudDeTitulos } from "../texto.ts";
import { redondear } from "../numeros.ts";

const MAXIMO = MAXIMOS.url_verificable;

/** Puntos por el solo hecho de que la página exista y responda. */
const POR_EXISTIR = 8;
/** Los que quedan se reparten según cuánto coincida el titular. */
const POR_COINCIDENCIA = MAXIMO - POR_EXISTIR;

/**
 * Debajo de esto se considera que el titular publicado no corresponde al
 * artículo. Calibrado a mano contra titulares reales: reescrituras legítimas
 * (cambiar el orden, quitar el nombre del medio) quedan arriba de 0.5.
 */
const SIMILITUD_MINIMA_ACEPTABLE = 0.35;

export async function evaluarUrlVerificable(
  noticia: NoticiaAValidar,
  traerUrl: TraerUrl,
): Promise<ResultadoSenal> {
  const base = { senal: "url_verificable", maximo: MAXIMO, veto: false } as const;

  if (noticia.urlOriginal === null || noticia.urlOriginal.trim() === "") {
    return {
      ...base,
      aporte: 0,
      disponible: true,
      detalle: {
        resultado: "sin_url",
        explicacion: "No hay enlace que comprobar.",
      },
    };
  }

  const url = noticia.urlOriginal.trim();

  let respuesta;
  try {
    respuesta = await traerUrl(url);
  } catch (error) {
    // No se pudo llegar. Esto NO es un hallazgo contra la noticia.
    return {
      ...base,
      aporte: 0,
      disponible: false,
      detalle: {
        resultado: "no_se_pudo_consultar",
        url,
        error: error instanceof Error ? error.message : String(error),
        explicacion:
          "No se pudo descargar la página. No dice nada sobre la noticia: mientras no se pueda " +
          "comprobar, queda en revisión humana.",
      },
    };
  }

  if (respuesta.estado < 200 || respuesta.estado >= 300) {
    return {
      ...base,
      aporte: 0,
      disponible: true,
      detalle: {
        resultado: "url_no_responde",
        url,
        estado_http: respuesta.estado,
        explicacion:
          `La página respondió ${respuesta.estado}. El enlace no lleva a un artículo publicado, ` +
          "que es la señal más clara de una nota fabricada.",
      },
    };
  }

  const metadatos = leerMetadatos(respuesta.html);

  if (metadatos.titulo === null) {
    return {
      ...base,
      aporte: POR_EXISTIR,
      disponible: true,
      detalle: {
        resultado: "existe_sin_titulo_legible",
        url,
        estado_http: respuesta.estado,
        explicacion:
          "La página existe, pero no expone un titular legible en sus metadatos, así que no se " +
          "pudo comparar con el que se publicó.",
      },
    };
  }

  const similitud = similitudDeTitulos(noticia.titulo, metadatos.titulo);
  const coincide = similitud >= SIMILITUD_MINIMA_ACEPTABLE;

  return {
    ...base,
    aporte: redondear(POR_EXISTIR + POR_COINCIDENCIA * similitud),
    disponible: true,
    detalle: {
      resultado: coincide ? "titular_coincide" : "titular_no_corresponde",
      url,
      estado_http: respuesta.estado,
      titular_publicado: noticia.titulo,
      titular_original: metadatos.titulo,
      similitud: redondear(similitud, 3),
      umbral: SIMILITUD_MINIMA_ACEPTABLE,
      ...(metadatos.publicadoEn !== null
        ? { publicado_en_origen: metadatos.publicadoEn.toISOString() }
        : {}),
      explicacion: coincide
        ? `El titular publicado coincide en un ${Math.round(similitud * 100)}% con el del artículo original.`
        : `El titular publicado solo coincide en un ${Math.round(similitud * 100)}% con el del artículo ` +
          "original. La página existe, pero no dice lo que la noticia afirma que dice.",
    },
  };
}
