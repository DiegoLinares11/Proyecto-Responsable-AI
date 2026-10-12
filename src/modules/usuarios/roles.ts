// ===========================================================================
// Cambiar el rol de una cuenta desde el panel de administración
//
// El rol solo lo cambia un administrador desde el servidor: el trigger
// `impedir_autoascenso` rechaza el cambio desde cualquier sesión de usuario.
// El panel verifica con la SESIÓN que quien pide el cambio tiene
// `usuarios_administrar`, y recién entonces escribe con la llave de servicio.
//
// Tres límites a propósito:
//   - Nadie cambia su propio rol, ni para subir ni para bajar.
//   - Desde el panel se asigna lector, publicador o moderador. Nombrar otro
//     administrador, o quitarle el rol a uno, se hace en el servidor
//     (scripts/asignar_rol.mjs): con una sesión robada no se toma el sistema.
//   - Cada cambio lleva un motivo, y queda en la auditoría con quién lo hizo.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export const ROLES_DEL_PANEL = ["lector", "publicador", "moderador"] as const;
export type RolDelPanel = (typeof ROLES_DEL_PANEL)[number];

export const NOMBRE_DE_ROL: Readonly<Record<string, string>> = {
  lector: "Lector",
  publicador: "Publicador",
  moderador: "Moderador",
  administrador: "Administrador",
};

export type PedidoDeCambio = {
  idActor: string;
  idUsuario: string;
  rolActual: string;
  rolNuevo: string;
  motivo: string;
};

/** Las reglas del panel, sin base de datos: devuelve por qué no, o null. */
export function validarCambioDeRol(p: PedidoDeCambio): string | null {
  if (p.idActor === p.idUsuario) {
    return "Nadie cambia su propio rol, ni para subir ni para bajar.";
  }
  if (p.rolActual === "administrador") {
    return "A un administrador no se le cambia el rol desde el panel: eso se hace en el servidor.";
  }
  if (!(ROLES_DEL_PANEL as readonly string[]).includes(p.rolNuevo)) {
    return "Desde el panel se asigna lector, publicador o moderador. Un administrador nuevo se nombra en el servidor.";
  }
  if (p.rolNuevo === p.rolActual) {
    return "Esa cuenta ya tiene ese rol.";
  }
  if (p.motivo.trim().length < 10) {
    return "Escribí el motivo, de al menos 10 caracteres: queda en la auditoría.";
  }
  return null;
}

export type Cuenta = { id: string; nombre: string; correo: string; rol: string; creadaEn: string };

/**
 * Las cuentas, con su correo. El correo no se puede leer con una sesión (la
 * columna no tiene permiso para `authenticated`), así que esto va con el
 * cliente de servicio y SOLO se llama después de comprobar el permiso.
 */
export async function leerCuentas(servicio: SupabaseClient, conDemostracion = false): Promise<Cuenta[]> {
  let consulta = servicio
    .from("usuarios")
    .select("id,nombre,correo,creado_en,roles(clave)")
    .order("creado_en", { ascending: false })
    .limit(200);
  if (!conDemostracion) consulta = consulta.not("correo", "like", "demo-%");

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Array<{
    id: string;
    nombre: string;
    correo: string;
    creado_en: string;
    roles: { clave: string } | null;
  }>).map((f) => ({ id: f.id, nombre: f.nombre, correo: f.correo, rol: f.roles?.clave ?? "desconocido", creadaEn: f.creado_en }));
}

export type CambioRegistrado = { cuando: string; correo: string; de: string; a: string; motivo: string; via: string };

export async function leerCambiosDeRol(servicio: SupabaseClient, limite = 20): Promise<CambioRegistrado[]> {
  const { data, error } = await servicio
    .from("auditoria")
    .select("ocurrido_en,detalle")
    .eq("entidad", "usuarios")
    .eq("accion", "rol_cambiado")
    .order("ocurrido_en", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ ocurrido_en: string; detalle: Record<string, unknown> }>).map((f) => ({
    cuando: f.ocurrido_en,
    correo: String(f.detalle["correo"] ?? ""),
    de: String(f.detalle["de"] ?? ""),
    a: String(f.detalle["a"] ?? ""),
    motivo: String(f.detalle["motivo"] ?? ""),
    via: String(f.detalle["via"] ?? ""),
  }));
}

/**
 * Hace el cambio y lo deja en la auditoría. Lee el rol actual de la base, no
 * del formulario: el formulario solo dice a quién y a qué.
 */
export async function cambiarRol(
  servicio: SupabaseClient,
  pedido: { idActor: string; idUsuario: string; rolNuevo: string; motivo: string },
): Promise<{ ok: string } | { error: string }> {
  const { data: usuario, error: errorUsuario } = await servicio
    .from("usuarios")
    .select("id,correo,id_rol,roles(clave)")
    .eq("id", pedido.idUsuario)
    .maybeSingle();
  if (errorUsuario) return { error: errorUsuario.message };
  if (usuario === null) return { error: "Esa cuenta no existe." };

  const fila = usuario as unknown as { id: string; correo: string; id_rol: number; roles: { clave: string } | null };
  const rolActual = fila.roles?.clave ?? "desconocido";

  const motivoDeRechazo = validarCambioDeRol({ ...pedido, rolActual });
  if (motivoDeRechazo !== null) return { error: motivoDeRechazo };

  const { data: rol, error: errorRol } = await servicio.from("roles").select("id").eq("clave", pedido.rolNuevo).single();
  if (errorRol) return { error: errorRol.message };

  const { error: errorCambio } = await servicio.from("usuarios").update({ id_rol: rol.id }).eq("id", fila.id);
  if (errorCambio) return { error: errorCambio.message };

  const { error: errorAuditoria } = await servicio.from("auditoria").insert({
    id_actor: pedido.idActor,
    entidad: "usuarios",
    id_entidad: fila.id,
    accion: "rol_cambiado",
    detalle: { correo: fila.correo, de: rolActual, a: pedido.rolNuevo, motivo: pedido.motivo.trim(), via: "portal /administracion" },
  });
  if (errorAuditoria) {
    // Un cambio sin rastro no se deja: se vuelve atrás.
    await servicio.from("usuarios").update({ id_rol: fila.id_rol }).eq("id", fila.id);
    return { error: "No se pudo registrar el cambio en la auditoría, así que no se hizo." };
  }

  return { ok: `${fila.correo}: ${NOMBRE_DE_ROL[rolActual] ?? rolActual} → ${NOMBRE_DE_ROL[pedido.rolNuevo]}.` };
}
