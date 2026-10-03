"use server";

// ===========================================================================
// Las decisiones del moderador
//
// Van con la sesión del moderador, no con la llave de servicio: el permiso
// `noticias_moderar` lo comprueba la política de fila en el motor. Si esta
// acción usara la llave de servicio, cualquier fallo de autorización de este
// lado —un `if` mal escrito, una comprobación olvidada— se convertiría en que
// cualquiera puede aprobar noticias.
//
// La llave de servicio entra solo para escribir la auditoría, y solo después
// de que la sesión del moderador pasó la política (ver `decidirComoModerador`).
// ===========================================================================

import { revalidatePath } from "next/cache";

import { perfilDelVisitante, clienteDelServidor } from "../../lib/supabase-servidor.ts";
import { clienteDeServicio } from "../../lib/supabase.ts";
import { decidirComoModerador, ErrorDeNoticia } from "../../modules/noticias/index.ts";

export type ResultadoDeModeracion = { error: string } | { ok: string } | undefined;

export async function moderar(
  _previo: ResultadoDeModeracion,
  datos: FormData,
): Promise<ResultadoDeModeracion> {
  const perfil = await perfilDelVisitante();
  if (perfil === null) return { error: "Hay que entrar." };

  const idNoticia = String(datos.get("id") ?? "");
  const decision = String(datos.get("decision") ?? "");
  const motivo = String(datos.get("motivo") ?? "").trim();

  if (!["aprobar", "rechazar", "archivar"].includes(decision)) {
    return { error: "Decisión no reconocida." };
  }

  // El motivo es obligatorio. Una decisión editorial sin explicación escrita no
  // se puede auditar después, y la auditoría es la mitad del punto de tener
  // moderación humana.
  if (motivo.length < 10) {
    return { error: "Escribí el motivo de la decisión (al menos 10 caracteres)." };
  }

  try {
    await decidirComoModerador(
      await clienteDelServidor(),
      clienteDeServicio(),
      idNoticia,
      decision as "aprobar" | "rechazar" | "archivar",
      perfil.usuario.id,
      motivo,
    );
  } catch (error) {
    if (error instanceof ErrorDeNoticia && error.codigo === "sin_permiso") {
      return { error: "Tu cuenta no tiene permiso para moderar." };
    }
    return { error: error instanceof Error ? error.message : String(error) };
  }

  revalidatePath("/moderacion");
  revalidatePath("/");

  const hechos: Record<string, string> = {
    aprobar: "Aprobada y publicada.",
    rechazar: "Marcada como no verificable.",
    archivar: "Archivada.",
  };
  return { ok: hechos[decision] ?? "Listo." };
}
