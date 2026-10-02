// ===========================================================================
// Fase 6 — Módulo de noticias
//
// La superficie que usan las rutas. Es lo que convierte las fases 2 y 3 de
// piezas probadas en un sistema que corre solo.
// ===========================================================================

export {
  crearBorrador,
  decidirComoModerador,
  validarYResolver,
  ErrorDeNoticia,
  type DatosDeBorrador,
  type DecisionDeModerador,
  type ResultadoDeValidacion,
} from "./servicio.ts";

export {
  crearConsultaDeFuentes,
  crearDependenciasDeValidacion,
  crearListadoDeFeeds,
  type OpcionesDeValidacion,
} from "./puertos.ts";
