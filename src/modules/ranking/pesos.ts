// ===========================================================================
// Fase 3 — Los pesos son configuración, no constantes
//
// Viven en la tabla `pesos_ranking`, con historial: la fila vigente es la que no
// tiene `vigente_hasta`, y cambiar un peso cierra la anterior y abre una nueva
// con autor y motivo. Ajustar el ranking es una decisión editorial y deja rastro
// (ADR 0003).
// ===========================================================================

import { PESOS_INICIALES, type CargarPesos, type ClavePeso, type Pesos } from "./tipos.ts";

export type FilaDePeso = {
  clave: string;
  valor: number;
};

const CLAVES: readonly ClavePeso[] = [
  "w_interaccion",
  "w_verificadas",
  "w_fuente",
  "w_veracidad",
  "gravedad",
];

export class PesosInvalidos extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "PesosInvalidos";
  }
}

/**
 * Convierte las filas de la base en un juego de pesos, validando.
 *
 * Falla ruidosamente ante una clave que falta en vez de rellenarla con el valor
 * inicial. Si la base tiene cuatro pesos de cinco, el ranking no es «casi el
 * configurado»: es otro ranking, y nadie eligió ese. Un error al arrancar se
 * arregla; un orden distinto sin que nadie lo decidiera, no se nota.
 */
export function interpretarPesos(filas: readonly FilaDePeso[]): Pesos {
  const porClave = new Map(filas.map((f) => [f.clave, f.valor]));

  const faltantes = CLAVES.filter((c) => !porClave.has(c));
  if (faltantes.length > 0) {
    throw new PesosInvalidos(
      `Faltan pesos vigentes en la base: ${faltantes.join(", ")}. ` +
        "El ranking no arranca con pesos a medias.",
    );
  }

  const sobrantes = [...porClave.keys()].filter(
    (c) => !CLAVES.includes(c as ClavePeso),
  );
  if (sobrantes.length > 0) {
    throw new PesosInvalidos(
      `La base trae pesos que la fórmula no usa: ${sobrantes.join(", ")}. ` +
        "O alguien se equivocó al escribirlos, o la fórmula cambió y este código no.",
    );
  }

  const pesos = Object.fromEntries(
    CLAVES.map((clave) => [clave, porClave.get(clave)!]),
  ) as Record<ClavePeso, number>;

  for (const clave of CLAVES) {
    const valor = pesos[clave];
    if (!Number.isFinite(valor)) {
      throw new PesosInvalidos(`El peso ${clave} no es un número finito: ${valor}`);
    }
    if (valor < 0) {
      throw new PesosInvalidos(
        `El peso ${clave} es negativo (${valor}). Un peso negativo invierte el sentido de su ` +
          "término y convierte la fórmula en algo que nadie puede explicar.",
      );
    }
  }

  // Sin decaimiento el feed deja de ser un feed: lo viejo con mucho acumulado se
  // queda arriba para siempre.
  if (pesos.gravedad <= 0) {
    throw new PesosInvalidos(
      `La gravedad debe ser mayor que cero (está en ${pesos.gravedad}). ` +
        "Con cero, el decaimiento por antigüedad desaparece.",
    );
  }

  return Object.freeze(pesos);
}

export type OpcionesDeCarga = {
  /** Los pesos cambian rara vez; no hace falta consultarlos en cada cálculo. */
  vidaDeCacheMs?: number;
  ahora?: () => number;
};

export function crearCargadorDePesos(
  consultar: () => Promise<FilaDePeso[]>,
  opciones: OpcionesDeCarga = {},
): CargarPesos {
  const vidaDeCacheMs = opciones.vidaDeCacheMs ?? 60_000;
  const ahora = opciones.ahora ?? Date.now;

  let guardado: { expira: number; pesos: Pesos } | null = null;

  return async function cargarPesos(): Promise<Pesos> {
    if (guardado !== null && guardado.expira > ahora()) return guardado.pesos;

    const pesos = interpretarPesos(await consultar());
    guardado = { expira: ahora() + vidaDeCacheMs, pesos };
    return pesos;
  };
}

/** Para pruebas y para el arranque en seco. Los mismos que siembra la migración. */
export function pesosIniciales(): Pesos {
  return PESOS_INICIALES;
}
