// La moderación desde la app: la cola, las alertas de contenido y las
// decisiones. Todo con la sesión del moderador; las políticas de fila deciden
// qué ve y qué puede cambiar (src/modules/redaccion).

import { NextResponse } from "next/server";

import { leerAlertasDeContenido, leerColaDeModeracion } from "../../../../lib/consultas.ts";
import { deObjeto, moderarNoticia, resolverAlertaDeContenido } from "../../../../modules/redaccion/index.ts";
import { leerJson, preflight, responder, sesionCon } from "../comun.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

export async function GET(peticion: Request) {
  const sesion = await sesionCon(peticion, "noticias_moderar");
  if (sesion instanceof NextResponse) return sesion;

  try {
    const [cola, alertas] = await Promise.all([
      leerColaDeModeracion(sesion.cliente),
      leerAlertasDeContenido(sesion.cliente),
    ]);
    return responder({ cola, alertas });
  } catch (error) {
    return responder({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

/** `{ sobre: "noticia" | "alerta", id, decision, motivo }` */
export async function POST(peticion: Request) {
  const sesion = await sesionCon(peticion, "noticias_moderar");
  if (sesion instanceof NextResponse) return sesion;

  const cuerpo = await leerJson(peticion);
  if (cuerpo === null) return responder({ error: "El cuerpo no es JSON." }, 400);

  const campo = deObjeto(cuerpo);
  const resultado =
    campo("sobre") === "alerta"
      ? await resolverAlertaDeContenido(sesion.cliente, sesion.perfil, campo)
      : await moderarNoticia(sesion.cliente, sesion.perfil, campo);

  return responder(resultado, "error" in resultado ? 422 : 200);
}
