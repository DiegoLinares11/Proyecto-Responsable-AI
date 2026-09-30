// ===========================================================================
// Señal 1 — Credibilidad de la fuente
//
// El dominio de la URL original se busca en el registro `fuentes`. El puntaje
// del medio, normalizado, es el aporte.
//
// Dos decisiones que importan:
//
//   · Un dominio que no está en el registro NO se rechaza. Entra con puntaje
//     bajo y la noticia acaba en la cola de moderación. La diferencia entre un
//     sistema que censura y uno que pide una segunda mirada.
//
//   · Una noticia sin URL no puede llegar a `verificada`. No es un caso de
//     error: sin enlace a la fuente no hay nada que verificar, y como esta
//     señal y la de URL suman 50 de los 100 puntos, el tope alcanzable queda
//     por debajo del umbral. La regla se cumple por aritmética, no por un `if`.
// ===========================================================================

import {
  CREDIBILIDAD_DESCONOCIDA,
  MAXIMOS,
  type BuscarFuente,
  type NoticiaAValidar,
  type ResultadoSenal,
} from "../tipos.ts";
import { candidatosDeUrl, extraerDominio } from "../dominio.ts";
import { redondear } from "../numeros.ts";

const MAXIMO = MAXIMOS.credibilidad_fuente;

export async function evaluarCredibilidadDeFuente(
  noticia: NoticiaAValidar,
  buscarFuente: BuscarFuente,
): Promise<ResultadoSenal> {
  const base = {
    senal: "credibilidad_fuente",
    maximo: MAXIMO,
    veto: false,
  } as const;

  if (noticia.urlOriginal === null || noticia.urlOriginal.trim() === "") {
    return {
      ...base,
      aporte: 0,
      disponible: true,
      detalle: {
        resultado: "sin_url",
        explicacion:
          "La noticia no trae enlace a la fuente original, así que no hay fuente que acreditar.",
      },
    };
  }

  const dominio = extraerDominio(noticia.urlOriginal);
  const candidatos = candidatosDeUrl(noticia.urlOriginal);

  if (dominio === null || candidatos.length === 0) {
    return {
      ...base,
      aporte: 0,
      disponible: true,
      detalle: {
        resultado: "url_no_interpretable",
        url: noticia.urlOriginal,
        explicacion:
          "No se pudo sacar un dominio de la URL. Una dirección IP o un enlace mal formado no identifica a un medio.",
      },
    };
  }

  const fuente = await buscarFuente(candidatos);

  if (fuente === null) {
    return {
      ...base,
      aporte: redondear((CREDIBILIDAD_DESCONOCIDA / 100) * MAXIMO),
      disponible: true,
      detalle: {
        resultado: "dominio_desconocido",
        dominio,
        candidatos_buscados: candidatos,
        credibilidad_asumida: CREDIBILIDAD_DESCONOCIDA,
        explicacion:
          `El dominio ${dominio} no está en el registro de fuentes. No se rechaza: entra con ` +
          `credibilidad ${CREDIBILIDAD_DESCONOCIDA} y la noticia pasa a revisión humana. Si un moderador ` +
          "aprueba el medio, el registro aprende de esa corrección.",
      },
    };
  }

  return {
    ...base,
    aporte: redondear((fuente.puntajeCredibilidad / 100) * MAXIMO),
    disponible: true,
    detalle: {
      resultado: "dominio_registrado",
      dominio: fuente.dominio,
      nombre: fuente.nombre,
      nivel: fuente.nivel,
      credibilidad: fuente.puntajeCredibilidad,
      explicacion:
        `${fuente.nombre} está en el registro con credibilidad ${fuente.puntajeCredibilidad} de 100, ` +
        `clasificado como ${fuente.nivel}.`,
    },
  };
}
