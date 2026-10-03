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
import { registrar } from "../../modules/auditoria/index.ts";

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

/**
 * Resolver una alerta de contenido.
 *
 * Tres salidas, y ninguna la toma el sistema solo:
 *
 *   - **archivar / rechazar**: la noticia sale de publicación. Va por
 *     `decidirComoModerador`, que la autoriza con la sesión del moderador y la
 *     audita.
 *   - **descartar**: era un falso positivo —una noticia que cita el sitio de un
 *     ministerio, por ejemplo— y sigue publicada.
 *
 * En los tres casos las alertas pendientes se cierran con un UPDATE que hace la
 * sesión del moderador. Lo autoriza la política `alertas_descarte_por_moderador`,
 * no un `if` de acá: si quien llama no tiene `noticias_moderar`, el UPDATE no
 * toca ninguna fila y se le dice.
 */
export async function resolverAlerta(
  _previo: ResultadoDeModeracion,
  datos: FormData,
): Promise<ResultadoDeModeracion> {
  const perfil = await perfilDelVisitante();
  if (perfil === null) return { error: "Hay que entrar." };

  const idNoticia = String(datos.get("id") ?? "");
  const decision = String(datos.get("decision") ?? "");
  const motivo = String(datos.get("motivo") ?? "").trim();

  if (!["archivar", "rechazar", "descartar"].includes(decision)) {
    return { error: "Decisión no reconocida." };
  }
  if (motivo.length < 10) {
    return { error: "Escribí el motivo de la decisión (al menos 10 caracteres)." };
  }

  const cliente = await clienteDelServidor();

  if (decision !== "descartar") {
    try {
      await decidirComoModerador(
        cliente,
        clienteDeServicio(),
        idNoticia,
        decision as "archivar" | "rechazar",
        perfil.usuario.id,
        motivo,
      );
    } catch (error) {
      if (error instanceof ErrorDeNoticia && error.codigo === "sin_permiso") {
        return { error: "Tu cuenta no tiene permiso para moderar." };
      }
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  const resuelta = {
    archivar: "Resuelta sacándola de publicación",
    rechazar: "Resuelta marcándola como no verificable",
    descartar: "Descartada: no era una orden",
  }[decision as "archivar" | "rechazar" | "descartar"];

  const { data, error } = await cliente
    .from("alertas_de_contenido")
    .update({ descartada_por: perfil.usuario.id, motivo_descarte: `${resuelta}. ${motivo}` })
    .eq("id_noticia", idNoticia)
    .is("descartada_en", null)
    .select("id");

  if (error !== null) return { error: `No se pudo cerrar la alerta: ${error.message}` };

  if ((data ?? []).length === 0 && decision === "descartar") {
    return {
      error: "No se cerró ninguna alerta: o tu cuenta no puede moderar, o alguien ya la resolvió.",
    };
  }

  // El descarte no pasa por `decidirComoModerador`, así que se audita acá. Como
  // allá, lo escribe el sistema y solo después de que la política dejó pasar el
  // cambio.
  if (decision === "descartar") {
    await registrar(clienteDeServicio(), {
      entidad: "noticia",
      idEntidad: idNoticia,
      accion: "alerta_descartada",
      idActor: perfil.usuario.id,
      detalle: { motivo, alertas_cerradas: (data ?? []).length },
    });
  }

  revalidatePath("/moderacion");
  if (decision !== "descartar") revalidatePath("/");

  return {
    ok: {
      archivar: "Fuera de publicación. La alerta quedó cerrada.",
      rechazar: "Marcada como no verificable. La alerta quedó cerrada.",
      descartar: "Alerta descartada. La noticia sigue publicada.",
    }[decision as "archivar" | "rechazar" | "descartar"],
  };
}
