// Publicar desde la app: el mismo flujo que el formulario del portal
// (src/modules/redaccion). El borrador lo crea la sesión del publicador; la
// validación, el sistema.

import { NextResponse } from "next/server";

import { deObjeto, publicarNoticia } from "../../../../modules/redaccion/index.ts";
import { leerJson, preflight, responder, sesionCon } from "../comun.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

export async function POST(peticion: Request) {
  const sesion = await sesionCon(peticion, "noticias_publicar");
  if (sesion instanceof NextResponse) return sesion;

  const cuerpo = await leerJson(peticion);
  if (cuerpo === null) return responder({ error: "El cuerpo no es JSON." }, 400);

  const resultado = await publicarNoticia(sesion.cliente, sesion.perfil, deObjeto(cuerpo));
  return responder(resultado, "error" in resultado ? 422 : 200);
}
