// ===========================================================================
// Recalcula el ranking y lo persiste.
//
//   node scripts/recalcular_ranking.mjs
//
// El decaimiento por antigüedad cambia con cada hora que pasa, así que esto no
// es algo que se corra «cuando algo cambia»: hay que correrlo periódicamente.
// En Vercel va como Cron Job apuntando a /api/ranking/recalcular; esto es el
// equivalente para local.
// ===========================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { recalcularRanking, explicarRelevancia } from "../src/modules/ranking/index.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const linea of readFileSync(join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const par = linea.match(/^([A-Z0-9_]+)=(.*)$/);
  if (par !== null) process.env[par[1]] = par[2].trim();
}

const cliente = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const resultado = await recalcularRanking(cliente);

console.log("PESOS VIGENTES");
for (const [clave, valor] of Object.entries(resultado.pesos)) {
  console.log(`  ${clave.padEnd(16)} ${valor}`);
}

console.log(
  `\nevaluadas: ${resultado.noticiasEvaluadas}   escritas: ${resultado.noticiasEscritas}` +
    `   ráfagas detectadas: ${resultado.rafagasDetectadas}\n`,
);

const visibles = resultado.desgloses
  .filter((d) => d.visible)
  .sort((a, b) => b.relevancia - a.relevancia);

for (const [indice, desglose] of visibles.entries()) {
  console.log(`${indice + 1}. ${desglose.idNoticia}`);
  console.log(explicarRelevancia(desglose).split("\n").map((l) => `   ${l}`).join("\n"));
  console.log("");
}

const fuera = resultado.desgloses.filter((d) => !d.visible);
if (fuera.length > 0) {
  console.log(`fuera del feed: ${fuera.length} (${fuera.map((d) => d.idNoticia.slice(0, 13)).join(", ")})`);
}
