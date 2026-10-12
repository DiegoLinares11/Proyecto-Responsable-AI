// ===========================================================================
// Cambiar el rol de una cuenta
//
//   node scripts/asignar_rol.mjs <correo> <lector|publicador|moderador|administrador> "<motivo>"
//
// El rol solo lo cambia un administrador desde el servidor: el trigger
// `impedir_autoascenso` rechaza el cambio desde cualquier sesión de usuario,
// así que esto corre con la llave de servicio, en la máquina de quien
// administra. Cada cambio queda en `auditoria`, con el rol anterior, el nuevo y
// el motivo: un permiso que nadie sabe por qué se dio es un permiso que nadie
// se anima a quitar.
// ===========================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient } from "@supabase/supabase-js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const linea of readFileSync(join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const par = linea.match(/^([A-Z0-9_]+)=(.*)$/);
  if (par !== null && process.env[par[1]] === undefined) process.env[par[1]] = par[2].trim();
}

const [correo, claveDeRol, motivo] = process.argv.slice(2);
const ROLES = ["lector", "publicador", "moderador", "administrador"];

if (!correo || !ROLES.includes(claveDeRol ?? "") || !motivo || motivo.trim().length < 5) {
  console.error('Uso: node scripts/asignar_rol.mjs <correo> <' + ROLES.join("|") + '> "<motivo>"');
  process.exit(1);
}

const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: usuario, error: errorUsuario } = await cliente
  .from("usuarios")
  .select("id, correo, id_rol, roles(clave)")
  .eq("correo", correo.trim().toLowerCase())
  .maybeSingle();
if (errorUsuario) throw errorUsuario;
if (usuario === null) {
  console.error(`No hay ninguna cuenta con el correo ${correo}. Primero tiene que entrar una vez a la app o al portal.`);
  process.exit(1);
}

const { data: rol, error: errorRol } = await cliente.from("roles").select("id, clave").eq("clave", claveDeRol).single();
if (errorRol) throw errorRol;

const anterior = usuario.roles?.clave ?? "(desconocido)";
if (usuario.id_rol === rol.id) {
  console.log(`${usuario.correo} ya es ${rol.clave}. No se cambió nada.`);
  process.exit(0);
}

const { error: errorCambio } = await cliente.from("usuarios").update({ id_rol: rol.id }).eq("id", usuario.id);
if (errorCambio) throw errorCambio;

const { error: errorAuditoria } = await cliente.from("auditoria").insert({
  id_actor: null, // lo hizo un administrador desde el servidor, no una sesión
  entidad: "usuarios",
  id_entidad: usuario.id,
  accion: "rol_cambiado",
  detalle: { correo: usuario.correo, de: anterior, a: rol.clave, motivo: motivo.trim(), via: "scripts/asignar_rol.mjs" },
});
if (errorAuditoria) throw errorAuditoria;

console.log(`${usuario.correo}: ${anterior} → ${rol.clave}. Quedó en la auditoría con el motivo.`);
