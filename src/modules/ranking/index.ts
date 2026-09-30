// ===========================================================================
// Fase 3 — Ranking de relevancia
//
// Superficie pública del módulo. Cero tokens: el orden lo decide una fórmula
// auditable, no un modelo (ADR 0003).
//
// Uso típico, en el trabajo que recalcula el feed:
//
//     const pesos = await cargarPesos();
//     const desgloses = insumos.map((i) => calcularRelevancia(i, pesos));
//     await guardarComponentes(desgloses);       // para poder ordenar en SQL
//     const feed = ordenarPorRelevancia(desgloses);
//
// Los componentes se guardan por separado para que la interfaz pueda mostrar el
// «¿por qué está aquí?» sin recalcular nada.
// ===========================================================================

export {
  DIAS_PARA_MADURAR,
  PENALIZACION_POR_ESTADO,
  PESOS_INICIALES,
  VALOR_POR_TIPO,
  type CargarPesos,
  type ClavePeso,
  type DesgloseDeRelevancia,
  type EstadoNoticia,
  type InsumosDeRanking,
  type InteraccionDeRanking,
  type Pesos,
  type RenglonDelDesglose,
  type ResultadoDeRafaga,
  type TipoInteraccion,
} from "./tipos.ts";

export {
  calcularRelevancia,
  explicarRelevancia,
  factorPorAntiguedadDeCuenta,
  ordenarPorRelevancia,
  type OpcionesDeCalculo,
} from "./calcular.ts";

export { detectarRafaga, type OpcionesDeRafaga } from "./rafagas.ts";

export {
  crearCargadorDePesos,
  interpretarPesos,
  pesosIniciales,
  PesosInvalidos,
  type FilaDePeso,
  type OpcionesDeCarga,
} from "./pesos.ts";
