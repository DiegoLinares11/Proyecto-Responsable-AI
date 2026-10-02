// ===========================================================================
// Auditoría — la bitácora append-only
//
// La tabla existe desde la Fase 1 y hasta ahora nadie escribía en ella. Este es
// el servicio que la llena.
//
// Dos propiedades que la hacen útil, y que se pierden con facilidad si no se
// cuidan a propósito:
//
//   1. **Solo se agrega.** No hay `update` ni `delete`, ni aquí ni en las
//      políticas de la Fase 1. Una bitácora que se puede editar no es una
//      bitácora.
//
//   2. **Registrar nunca tumba la operación.** Si la escritura falla, la
//      operación sigue y el fallo se ve en los logs del servidor. Lo contrario
//      —no publicar una noticia porque no se pudo auditar— convierte la
//      auditoría en un punto único de falla del producto. Es la misma decisión
//      que ya se tomó en el chatbot y por la misma razón.
//
// Qué NO va aquí: datos personales que no hagan falta para entender la
// decisión. La tabla guarda qué decidió el sistema y por qué; el contenido
// completo de lo que escribió un usuario vive en su propia tabla, con su propia
// política de retención.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

/** Las entidades sobre las que el sistema toma decisiones registrables. */
export type EntidadAuditada =
  | "noticia"
  | "fuente"
  | "usuario"
  | "silencio"
  | "conversacion"
  | "ranking";

export type EventoDeAuditoria = {
  entidad: EntidadAuditada;
  /** El identificador de la fila afectada, si hay una. */
  idEntidad?: string | null;
  /** Qué pasó, en minúsculas y con guion bajo: `validada`, `estado_cambiado`. */
  accion: string;
  /** Quién lo provocó. `null` cuando lo hizo el sistema por su cuenta. */
  idActor?: string | null;
  /** El porqué, con los números que lo sustentan. Va tal cual a la columna jsonb. */
  detalle?: Record<string, unknown>;
};

/**
 * Escribe un evento. No lanza nunca.
 *
 * Devuelve si se pudo registrar, para que quien llame pueda decidir si eso le
 * importa — pero ninguna ruta debería abortar por un `false`.
 */
export async function registrar(
  cliente: SupabaseClient,
  evento: EventoDeAuditoria,
): Promise<boolean> {
  const { error } = await cliente.from("auditoria").insert({
    entidad: evento.entidad,
    id_entidad: evento.idEntidad ?? null,
    accion: evento.accion,
    id_actor: evento.idActor ?? null,
    detalle: evento.detalle ?? {},
  });

  if (error !== null) {
    console.error(
      `No se pudo registrar en auditoría (${evento.entidad}/${evento.accion}):`,
      error.message,
    );
    return false;
  }

  return true;
}

/** Varios eventos de una sola vez. Misma garantía: no lanza. */
export async function registrarVarios(
  cliente: SupabaseClient,
  eventos: readonly EventoDeAuditoria[],
): Promise<boolean> {
  if (eventos.length === 0) return true;

  const { error } = await cliente.from("auditoria").insert(
    eventos.map((evento) => ({
      entidad: evento.entidad,
      id_entidad: evento.idEntidad ?? null,
      accion: evento.accion,
      id_actor: evento.idActor ?? null,
      detalle: evento.detalle ?? {},
    })),
  );

  if (error !== null) {
    console.error(`No se pudieron registrar ${eventos.length} eventos:`, error.message);
    return false;
  }

  return true;
}
