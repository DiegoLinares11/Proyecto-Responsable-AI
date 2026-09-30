// ===========================================================================
// Fase 3 — Detección de ráfagas coordinadas
//
// La fórmula del ranking es pública a propósito (ADR 0003), y una fórmula
// pública es una fórmula atacable. Esta es la tercera defensa, después del tope
// por usuario —que vive en la restricción de unicidad de la base— y del peso por
// antigüedad de cuenta.
//
// Qué busca: un pico de interacciones concentrado en poco tiempo y proveniente
// de cuentas creadas casi todas juntas. Cualquiera de las dos cosas por separado
// es normal; una noticia importante recibe muchas interacciones rápido, y una
// campaña de registro legítima crea muchas cuentas el mismo día. Lo que no es
// normal es que coincidan.
//
// Y lo que hace al detectarlo: NADA automático. Marca y escala a una persona. El
// sistema no borra interacciones ni castiga cuentas por su cuenta — eso sería
// castigar sobre una heurística, y esta heurística se equivoca.
// ===========================================================================

import {
  DIAS_PARA_MADURAR,
  type InteraccionDeRanking,
  type ResultadoDeRafaga,
} from "./tipos.ts";

export type OpcionesDeRafaga = {
  /** Ancho de la ventana que se examina, en minutos. */
  ventanaMinutos?: number;
  /** Cuántas interacciones en la ventana hacen falta para mirar más de cerca. */
  minimoDeInteracciones?: number;
  /** Qué fracción de esas interacciones debe venir de cuentas nuevas. */
  fraccionDeCuentasNuevas?: number;
};

const SIN_SOSPECHA: ResultadoDeRafaga = {
  sospechosa: false,
  motivo: "Sin señales de tracción coordinada.",
  interaccionesEnLaVentana: 0,
  cuentasNuevasImplicadas: 0,
};

function esCuentaNueva(interaccion: InteraccionDeRanking, ahora: Date): boolean {
  const dias = (ahora.getTime() - interaccion.cuentaCreadaEn.getTime()) / 86_400_000;
  return dias < DIAS_PARA_MADURAR;
}

/**
 * Busca la ventana de tiempo con más interacciones y revisa de dónde vienen.
 *
 * Se recorre con una ventana deslizante sobre las interacciones ordenadas, que
 * para los volúmenes de este proyecto es de sobra y evita tener que elegir
 * puntos de corte arbitrarios como «por hora del reloj» — un ataque que empieza
 * a las 10:59 quedaría partido en dos horas y ninguna se vería anómala.
 */
export function detectarRafaga(
  interacciones: readonly InteraccionDeRanking[],
  ahora: Date,
  opciones: OpcionesDeRafaga = {},
): ResultadoDeRafaga {
  const ventanaMinutos = opciones.ventanaMinutos ?? 30;
  const minimoDeInteracciones = opciones.minimoDeInteracciones ?? 20;
  const fraccionDeCuentasNuevas = opciones.fraccionDeCuentasNuevas ?? 0.6;

  if (interacciones.length < minimoDeInteracciones) return SIN_SOSPECHA;

  const ordenadas = [...interacciones].sort(
    (a, b) => a.creadaEn.getTime() - b.creadaEn.getTime(),
  );
  const ventanaMs = ventanaMinutos * 60_000;

  let mejorInicio = 0;
  let mejorCantidad = 0;
  let mejorNuevas = 0;

  let inicio = 0;
  for (let fin = 0; fin < ordenadas.length; fin++) {
    const tFin = ordenadas[fin]!.creadaEn.getTime();
    while (tFin - ordenadas[inicio]!.creadaEn.getTime() > ventanaMs) inicio++;

    const cantidad = fin - inicio + 1;
    if (cantidad > mejorCantidad) {
      mejorCantidad = cantidad;
      mejorInicio = inicio;
    }
  }

  if (mejorCantidad < minimoDeInteracciones) return SIN_SOSPECHA;

  const ventana = ordenadas.slice(mejorInicio, mejorInicio + mejorCantidad);
  mejorNuevas = ventana.filter((i) => esCuentaNueva(i, ahora)).length;

  const fraccion = mejorNuevas / mejorCantidad;

  if (fraccion < fraccionDeCuentasNuevas) {
    return {
      sospechosa: false,
      motivo:
        `Hubo ${mejorCantidad} interacciones en ${ventanaMinutos} minutos, pero solo ` +
        `${mejorNuevas} vienen de cuentas nuevas. Un pico así es lo que hace una noticia importante.`,
      interaccionesEnLaVentana: mejorCantidad,
      cuentasNuevasImplicadas: mejorNuevas,
    };
  }

  return {
    sospechosa: true,
    motivo:
      `${mejorCantidad} interacciones en ${ventanaMinutos} minutos, y ${mejorNuevas} de ellas ` +
      `(${Math.round(fraccion * 100)}%) vienen de cuentas creadas hace menos de ${DIAS_PARA_MADURAR} ` +
      "días. El pico por sí solo sería normal; que venga casi todo de cuentas nuevas, no. " +
      "Se marca para que lo revise una persona; no se borra nada.",
    interaccionesEnLaVentana: mejorCantidad,
    cuentasNuevasImplicadas: mejorNuevas,
  };
}
