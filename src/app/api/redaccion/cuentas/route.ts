// Las cuentas y sus roles desde la app. El permiso se comprueba con la sesión;
// la lectura de correos y el cambio de rol van con la llave de servicio, porque
// ninguna sesión puede leer correos ajenos ni cambiar un rol (trigger
// `impedir_autoascenso`). Las reglas: src/modules/usuarios/roles.ts.

import { NextResponse } from "next/server";

import { clienteDeServicio } from "../../../../lib/supabase.ts";
import { cambiarRol, leerCambiosDeRol, leerCuentas } from "../../../../modules/usuarios/roles.ts";
import { deObjeto } from "../../../../modules/redaccion/index.ts";
import { leerJson, preflight, responder, sesionCon } from "../comun.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

export async function GET(peticion: Request) {
  const sesion = await sesionCon(peticion, "usuarios_administrar");
  if (sesion instanceof NextResponse) return sesion;

  const conDemostracion = new URL(peticion.url).searchParams.get("demo") === "1";
  const servicio = clienteDeServicio();
  try {
    const [cuentas, cambios] = await Promise.all([leerCuentas(servicio, conDemostracion), leerCambiosDeRol(servicio)]);
    return responder({ cuentas, cambios, yo: sesion.perfil.usuario.id });
  } catch (error) {
    return responder({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

/** `{ id_usuario, rol, motivo }` */
export async function POST(peticion: Request) {
  const sesion = await sesionCon(peticion, "usuarios_administrar");
  if (sesion instanceof NextResponse) return sesion;

  const cuerpo = await leerJson(peticion);
  if (cuerpo === null) return responder({ error: "El cuerpo no es JSON." }, 400);

  const campo = deObjeto(cuerpo);
  const resultado = await cambiarRol(clienteDeServicio(), {
    idActor: sesion.perfil.usuario.id,
    idUsuario: campo("id_usuario"),
    rolNuevo: campo("rol"),
    motivo: campo("motivo"),
  });
  return responder(resultado, "error" in resultado ? 422 : 200);
}
