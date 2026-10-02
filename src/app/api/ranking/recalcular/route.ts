// ===========================================================================
// Recálculo del ranking, para un Cron Job
//
// El decaimiento por antigüedad cambia con cada hora que pasa, así que esto no
// es algo que se dispare «cuando algo cambia»: hay que correrlo periódicamente.
// En Vercel se configura en vercel.json apuntando acá.
//
// Va protegido con un secreto compartido. Sin eso, cualquiera podría hacer
// trabajar al servidor desde internet — no es que pueda cambiar el orden a su
// favor (la fórmula es la misma para todos), pero sí consumir recursos del plan
// gratuito, que es el presupuesto del proyecto.
// ===========================================================================

import { NextResponse } from "next/server";

import { recalcularRanking } from "../../../../modules/ranking/index.ts";
import { clienteDeServicio } from "../../../../lib/supabase.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(peticion: Request): boolean {
  const esperado = process.env["CRON_SECRET"];

  // Sin secreto configurado, solo se permite fuera de producción. Un endpoint
  // que hace trabajar al servidor no debe quedar abierto por omisión.
  if (esperado === undefined || esperado.trim() === "") {
    return process.env["NODE_ENV"] !== "production" && process.env["VERCEL_ENV"] !== "production";
  }

  const cabecera = peticion.headers.get("authorization");
  return cabecera === `Bearer ${esperado}`;
}

export async function GET(peticion: Request) {
  if (!autorizado(peticion)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const resultado = await recalcularRanking(clienteDeServicio());

    return NextResponse.json({
      evaluadas: resultado.noticiasEvaluadas,
      escritas: resultado.noticiasEscritas,
      rafagasDetectadas: resultado.rafagasDetectadas,
      pesos: resultado.pesos,
    });
  } catch (error) {
    console.error("Falló el recálculo del ranking:", error);
    return NextResponse.json(
      { error: "No se pudo recalcular. El detalle quedó en los logs." },
      { status: 500 },
    );
  }
}
