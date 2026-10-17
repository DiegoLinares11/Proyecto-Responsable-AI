// ===========================================================================
// El canal recomienda; publica una persona (R-09)
//
// Lo que pasa el umbral de verificación ya no se publica solo: queda en
// revisión, y la cola le dice al moderador cuáles recomienda el canal. Es un
// dato para decidir, no una decisión: el botón lo aprieta alguien.
// ===========================================================================

import { UMBRAL_VERIFICADA } from "../validacion/index.ts";

/** Si el canal recomienda publicarla: pasó el umbral y espera a un moderador. */
export function recomendadaParaPublicar(estado: string, puntaje: number | string | null): boolean {
  if (estado !== "en_revision" || puntaje === null) return false;
  const valor = Number(puntaje);
  return Number.isFinite(valor) && valor >= UMBRAL_VERIFICADA;
}
