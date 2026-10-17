// El panel de gasto desde la app (R-11). Solo para `usuarios_administrar`: el
// permiso se comprueba con la sesión, y las vistas se leen con la llave de
// servicio porque ninguna sesión puede leerlas (ver src/modules/gasto).

import { NextResponse } from "next/server";

import { entornoDelModelo } from "../../../../lib/entorno.ts";
import { clienteDeServicio } from "../../../../lib/supabase.ts";
import { modelosDeGuardiaConfigurados } from "../../../../modules/chatbot/proveedor/index.ts";
import { leerResumenDeGasto } from "../../../../modules/gasto/index.ts";
import { preflight, responder, sesionCon } from "../comun.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

export async function GET(peticion: Request) {
  const sesion = await sesionCon(peticion, "usuarios_administrar");
  if (sesion instanceof NextResponse) return sesion;

  const configuracion = entornoDelModelo();
  try {
    const resumen = await leerResumenDeGasto(clienteDeServicio(), {
      topeUsd: configuracion.topeGastoUsd,
      creditoUsd: configuracion.creditoUsd,
      modelosDeGuardia: modelosDeGuardiaConfigurados(),
    });
    return responder(resumen);
  } catch (error) {
    return responder({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
