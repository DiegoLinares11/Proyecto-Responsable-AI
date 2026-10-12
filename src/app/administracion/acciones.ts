"use server";

// El permiso se comprueba con la SESIÓN de quien pide el cambio; la escritura
// va con la llave de servicio porque el trigger `impedir_autoascenso` no deja
// cambiar un rol desde ninguna sesión. Las reglas del panel están en
// src/modules/usuarios/roles.ts.

import { revalidatePath } from "next/cache";

import { perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { clienteDeServicio } from "../../lib/supabase.ts";
import { cambiarRol } from "../../modules/usuarios/roles.ts";

export type ResultadoDeCambio = { ok: string } | { error: string } | undefined;

export async function cambiarRolDesdeElPanel(
  _previo: ResultadoDeCambio,
  datos: FormData,
): Promise<ResultadoDeCambio> {
  const perfil = await perfilDelVisitante();
  if (perfil === null) return { error: "Hay que entrar." };
  if (!perfil.permisos.has("usuarios_administrar")) {
    return { error: "Tu cuenta no tiene el permiso usuarios_administrar." };
  }

  const resultado = await cambiarRol(clienteDeServicio(), {
    idActor: perfil.usuario.id,
    idUsuario: String(datos.get("id_usuario") ?? ""),
    rolNuevo: String(datos.get("rol") ?? ""),
    motivo: String(datos.get("motivo") ?? ""),
  });

  if ("ok" in resultado) revalidatePath("/administracion");
  return resultado;
}
