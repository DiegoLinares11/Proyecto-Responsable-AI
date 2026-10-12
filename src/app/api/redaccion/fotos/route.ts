// Buscar fotos de archivo con licencia libre (R-10). Solo para quien publica:
// es una consulta a un servicio ajeno en nombre del proyecto.

import { NextResponse } from "next/server";

import { buscarEnCommons } from "../../../../modules/imagenes/commons.ts";
import { preflight, responder, sesionCon } from "../comun.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

export async function GET(peticion: Request) {
  const sesion = await sesionCon(peticion, "noticias_publicar");
  if (sesion instanceof NextResponse) return sesion;

  const consulta = new URL(peticion.url).searchParams.get("q") ?? "";
  try {
    return responder({ fotos: await buscarEnCommons(consulta) });
  } catch {
    return responder({ error: "No se pudo consultar Wikimedia Commons. Probá de nuevo en un momento." }, 502);
  }
}
