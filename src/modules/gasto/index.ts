// ===========================================================================
// El panel de gasto (R-11)
//
// Cuánto lleva gastado el chatbot, cuánto queda antes del tope y cuánto cuesta
// cada función. El total sale de `vista_gasto_api`, la misma vista que usa el
// tope para cortar: si el panel y el tope leyeran números distintos, el panel
// podría decir que queda margen mientras el chat ya está cortado.
//
// El costo por función se deduce del modelo con el que terminó cada turno
// (`vista_gasto_por_modelo`): sin modelo lo cortó la capa 0, gratis; con el
// modelo de guardia solo pasó por el clasificador; con otro llegó a la
// respuesta, y su costo incluye al clasificador.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type FilaDeGastoPorModelo = {
  modelo: string | null;
  turnos: number | string;
  gasto_usd: number | string;
  promedio_usd: number | string;
};

export type Funcion = "filtro" | "clasificador" | "respuesta";

export type GastoDeFuncion = {
  funcion: Funcion;
  nombre: string;
  explicacion: string;
  modelos: string[];
  turnos: number;
  gastoUsd: number;
  promedioUsd: number;
};

export type ResumenDeGasto = {
  gastoUsd: number;
  turnos: number;
  topeUsd: number;
  /** Lo que falta para que el tope corte el chat. Nunca negativo. */
  margenUsd: number;
  /** Entre 0 y 1. */
  usoDelTope: number;
  /** El crédito cargado en la cuenta del proveedor, si se configuró. */
  creditoUsd: number | null;
  porFuncion: GastoDeFuncion[];
  /** Cuántas respuestas completas caben en el margen, al costo promedio. */
  respuestasRestantes: number | null;
};

const NOMBRES: Record<Funcion, { nombre: string; explicacion: string }> = {
  filtro: {
    nombre: "Filtro previo",
    explicacion: "Lo cortó la capa 0 (vacío, muy largo, límite diario o tope) sin llamar a ningún modelo.",
  },
  clasificador: {
    nombre: "Solo el clasificador",
    explicacion: "El modelo chico lo etiquetó y no hizo falta más: una cortesía o un bloqueo.",
  },
  respuesta: {
    nombre: "Clasificador y respuesta",
    explicacion: "Llegó al modelo grande. El costo incluye al clasificador.",
  },
};

const numero = (valor: number | string | null | undefined) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Arma el resumen. Pura: recibe lo que devolvieron las dos vistas. */
export function resumirGasto(entrada: {
  total: { gasto_usd: number | string; turnos: number | string };
  porModelo: readonly FilaDeGastoPorModelo[];
  topeUsd: number;
  creditoUsd: number | null;
  modelosDeGuardia: readonly string[];
}): ResumenDeGasto {
  const gastoUsd = numero(entrada.total.gasto_usd);
  const margenUsd = Math.max(0, entrada.topeUsd - gastoUsd);

  const funciones = new Map<Funcion, GastoDeFuncion>();
  for (const fila of entrada.porModelo) {
    const funcion: Funcion =
      fila.modelo === null ? "filtro" : entrada.modelosDeGuardia.includes(fila.modelo) ? "clasificador" : "respuesta";
    const actual = funciones.get(funcion) ?? {
      funcion,
      ...NOMBRES[funcion],
      modelos: [],
      turnos: 0,
      gastoUsd: 0,
      promedioUsd: 0,
    };
    if (fila.modelo !== null) actual.modelos.push(fila.modelo);
    actual.turnos += numero(fila.turnos);
    actual.gastoUsd += numero(fila.gasto_usd);
    funciones.set(funcion, actual);
  }

  const porFuncion = (["filtro", "clasificador", "respuesta"] as const)
    .map((f) => funciones.get(f))
    .filter((f): f is GastoDeFuncion => f !== undefined)
    .map((f) => ({ ...f, promedioUsd: f.turnos === 0 ? 0 : f.gastoUsd / f.turnos }));

  const respuesta = porFuncion.find((f) => f.funcion === "respuesta");
  const respuestasRestantes =
    respuesta === undefined || respuesta.promedioUsd === 0 ? null : Math.floor(margenUsd / respuesta.promedioUsd);

  return {
    gastoUsd,
    turnos: numero(entrada.total.turnos),
    topeUsd: entrada.topeUsd,
    margenUsd,
    usoDelTope: entrada.topeUsd <= 0 ? 1 : Math.min(1, gastoUsd / entrada.topeUsd),
    creditoUsd: entrada.creditoUsd,
    porFuncion,
    respuestasRestantes,
  };
}

/**
 * Lee las dos vistas y arma el resumen. SOLO SERVIDOR, con la llave de
 * servicio: ninguna sesión puede leer estas vistas, a propósito. Quien llame
 * tiene que haber comprobado antes `usuarios_administrar`.
 */
export async function leerResumenDeGasto(
  clienteDeServicio: SupabaseClient,
  opciones: { topeUsd: number; creditoUsd: number | null; modelosDeGuardia: readonly string[] },
): Promise<ResumenDeGasto> {
  const [total, porModelo] = await Promise.all([
    clienteDeServicio.from("vista_gasto_api").select("gasto_usd, turnos").single(),
    clienteDeServicio.from("vista_gasto_por_modelo").select("modelo, turnos, gasto_usd, promedio_usd"),
  ]);
  if (total.error !== null) throw new Error(`No se pudo leer el gasto: ${total.error.message}`);
  if (porModelo.error !== null) throw new Error(`No se pudo leer el desglose: ${porModelo.error.message}`);

  return resumirGasto({
    total: total.data as { gasto_usd: number; turnos: number },
    porModelo: (porModelo.data ?? []) as FilaDeGastoPorModelo[],
    ...opciones,
  });
}
