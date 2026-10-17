// ===========================================================================
// Lo no confirmado se dice (R-13)
//
// Si la respuesta cita una noticia publicada «en desarrollo», tiene que decir
// que no está confirmada. No se le pide al modelo y se espera: el modelo ve el
// dato en el bloque de la noticia, pero la garantía es esta función, que corre
// después de la capa 3 y no necesita que el modelo coopere. Es la misma idea
// que las comprobaciones de la capa 3: lo que importa no se deja a la buena
// voluntad del modelo.
// ===========================================================================

import type { NivelDeConfianza, NoticiaParaElModelo } from "./tipos.ts";

// Solo cuenta la etiqueta exacta, la misma que el usuario ve en la portada y en
// la lectura. Una versión anterior aceptaba «no confirmado», y en producción el
// modelo escribió «no hay respaldo suficiente para confirmar»: decía la duda,
// pero no que la noticia está en desarrollo.
const YA_LO_DICE = /en desarrollo/i;

export type RespuestaAvisada = { respuesta: string; confianza: NivelDeConfianza };

export function avisarLoNoConfirmado(
  respuesta: string,
  confianza: NivelDeConfianza,
  citadas: readonly string[],
  noticias: readonly NoticiaParaElModelo[],
): RespuestaAvisada {
  const enDesarrollo = noticias.filter((n) => n.enDesarrollo === true && citadas.includes(n.id));
  if (enDesarrollo.length === 0) return { respuesta, confianza };

  // Lo que se apoya en algo no confirmado no puede salir con confianza alta.
  const confianzaAcotada: NivelDeConfianza = confianza === "alta" ? "media" : confianza;

  if (YA_LO_DICE.test(respuesta)) return { respuesta, confianza: confianzaAcotada };

  const titulos = enDesarrollo.map((n) => `«${n.titulo}»`).join(" y ");
  const aviso =
    enDesarrollo.length === 1
      ? `Ojo: ${titulos} está en desarrollo; lo que dice todavía no está confirmado.`
      : `Ojo: ${titulos} están en desarrollo; lo que dicen todavía no está confirmado.`;

  return { respuesta: `${respuesta.trimEnd()}\n\n${aviso}`, confianza: confianzaAcotada };
}
