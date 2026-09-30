// ===========================================================================
// Fase 2 — El canal de validación
//
// Corre las cinco señales y decide el estado. Toda la lógica de decisión está
// en esta función y en ningún otro lugar, para que la regla se pueda leer
// completa de un tirón.
//
// La regla que no se negocia (docs/validacion-noticias.md):
//
//   Nada por debajo del umbral se publica automáticamente. Los pesos se pueden
//   discutir y los umbrales se pueden calibrar, pero el sistema nunca publica
//   solo algo de lo que no está seguro. Un moderador que espera es un costo;
//   una noticia falsa con el sello de «verificada» es el daño que este
//   proyecto existe para evitar.
//
// Y su contraparte, igual de importante: el sistema tampoco borra. Marca,
// explica y escala a una persona.
// ===========================================================================

import {
  UMBRAL_REVISION,
  UMBRAL_VERIFICADA,
  type ClaveSenal,
  type Dependencias,
  type EstadoVeredicto,
  type NoticiaAValidar,
  type ResultadoSenal,
  type Veredicto,
} from "./tipos.ts";
import { evaluarCredibilidadDeFuente } from "./senales/credibilidad-fuente.ts";
import { evaluarUrlVerificable } from "./senales/url-verificable.ts";
import { evaluarCorroboracion } from "./senales/corroboracion.ts";
import { evaluarDesmentido } from "./senales/desmentido.ts";
import { evaluarCoherencia } from "./senales/coherencia.ts";
import { recortar, redondear } from "./numeros.ts";

/** Orden fijo de presentación, para que el desglose se lea siempre igual. */
const ORDEN: readonly ClaveSenal[] = [
  "credibilidad_fuente",
  "url_verificable",
  "corroboracion",
  "desmentido",
  "coherencia",
];

function ordenar(senales: ResultadoSenal[]): ResultadoSenal[] {
  return [...senales].sort((a, b) => ORDEN.indexOf(a.senal) - ORDEN.indexOf(b.senal));
}

function decidir(
  puntaje: number,
  vetadas: ResultadoSenal[],
  indisponibles: ResultadoSenal[],
): { estado: EstadoVeredicto; motivo: string } {
  // 1. El veto primero. Ninguna otra señal lo compensa.
  if (vetadas.length > 0) {
    return {
      estado: "desmentida",
      motivo:
        "Una organización de verificación ya calificó esta afirmación como falsa. " +
        "El veto es anterior a cualquier puntaje.",
    };
  }

  // 2. Puntaje claramente bajo. No importa si algo quedó sin comprobar: lo que
  //    sí se comprobó no alcanza.
  if (puntaje < UMBRAL_REVISION) {
    return {
      estado: "no_verificable",
      motivo:
        `El puntaje de veracidad es ${puntaje} de 100, por debajo de ${UMBRAL_REVISION}. ` +
        "El autor puede ver el desglose, corregir y volver a enviarla.",
    };
  }

  // 3. Puntaje suficiente, pero con señales que no se pudieron averiguar.
  //    Nunca se da por buena una noticia por falta de datos.
  if (indisponibles.length > 0) {
    const nombres = indisponibles.map((s) => s.senal).join(", ");
    return {
      estado: "en_revision",
      motivo:
        `El puntaje es ${puntaje} de 100, suficiente, pero no se pudo comprobar: ${nombres}. ` +
        "Una señal que no se pudo averiguar no se asume favorable, así que la decisión la toma una persona.",
    };
  }

  // 4. Zona intermedia.
  if (puntaje < UMBRAL_VERIFICADA) {
    return {
      estado: "en_revision",
      motivo:
        `El puntaje es ${puntaje} de 100, entre ${UMBRAL_REVISION} y ${UMBRAL_VERIFICADA}. ` +
        "Hay indicios a favor pero no suficientes para publicar sin que alguien la lea.",
    };
  }

  return {
    estado: "verificada",
    motivo:
      `El puntaje es ${puntaje} de 100 y las cinco señales se pudieron comprobar. ` +
      "Se publica y entra al ranking con peso completo.",
  };
}

export async function evaluarVeracidad(
  noticia: NoticiaAValidar,
  deps: Dependencias,
): Promise<Veredicto> {
  const ahora = deps.ahora?.() ?? new Date();
  const exigirVerificador = deps.exigirVerificadorDeHechos ?? true;

  // Las cuatro que salen a la red van en paralelo: la validación corre cuando
  // alguien acaba de enviar una noticia y está esperando la respuesta.
  const [credibilidad, url, corroboracion, desmentido] = await Promise.all([
    evaluarCredibilidadDeFuente(noticia, deps.buscarFuente),
    evaluarUrlVerificable(noticia, deps.traerUrl),
    evaluarCorroboracion(noticia, deps.buscarCobertura, deps.buscarFuente),
    evaluarDesmentido(noticia, deps.buscarDesmentidos, exigirVerificador),
  ]);

  const coherencia = evaluarCoherencia(noticia, ahora);

  const senales = ordenar([credibilidad, url, corroboracion, desmentido, coherencia]);

  const puntaje = redondear(
    recortar(
      senales.reduce((suma, s) => suma + s.aporte, 0),
      0,
      100,
    ),
    0,
  );

  const vetadas = senales.filter((s) => s.veto);
  const indisponibles = senales.filter((s) => !s.disponible);

  const { estado, motivo } = decidir(puntaje, vetadas, indisponibles);

  return { puntaje, estado, motivo, senales };
}

/**
 * Las filas que van a la tabla `validaciones`, una por señal.
 *
 * Es lo que hace que el desglose sea auditable después: el puntaje nunca se
 * guarda solo, siempre con la evidencia de cada señal al lado.
 */
export function filasDeValidacion(
  idNoticia: string,
  veredicto: Veredicto,
): ReadonlyArray<{
  id_noticia: string;
  senal: ClaveSenal;
  aporte: number;
  disponible: boolean;
  detalle: Record<string, unknown>;
}> {
  return veredicto.senales.map((s) => ({
    id_noticia: idNoticia,
    senal: s.senal,
    aporte: s.aporte,
    disponible: s.disponible,
    detalle: { ...s.detalle, maximo: s.maximo, veto: s.veto },
  }));
}
