/** La columna `validaciones.aporte` es numeric(6,2). Se redondea antes de salir. */
export function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/** Recorta a un rango cerrado. */
export function recortar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}
