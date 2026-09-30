// ===========================================================================
// Muestra el feed ordenado, con el desglose de cada posición.
//
//   node scripts/mostrar_feed.mjs
//
// Lee las credenciales de `.env.local` y consulta las vistas de la Fase 3 con
// la llave de servicio, que es el camino que usará el trabajo que recalcula el
// ranking. Las vistas no están otorgadas a `anon` ni a `authenticated` a
// propósito: no son API.
//
// Sirve para dos cosas: ver el ranking funcionando sobre datos de verdad, y
// tener a mano el «¿por qué está aquí?» completo de cada noticia cuando haya
// que discutir los pesos.
// ===========================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  calcularRelevancia,
  explicarRelevancia,
  interpretarPesos,
  ordenarPorRelevancia,
} from "../src/modules/ranking/index.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

function leerEntorno() {
  const valores = new Map();
  let contenido;
  try {
    contenido = readFileSync(join(RAIZ, ".env.local"), "utf8");
  } catch {
    console.error("No encuentro .env.local. Copialo de .env.example y llenalo.");
    process.exit(1);
  }
  for (const linea of contenido.split("\n")) {
    const par = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (par !== null) valores.set(par[1], par[2].trim());
  }
  return valores;
}

const entorno = leerEntorno();
const URL_BASE = entorno.get("NEXT_PUBLIC_SUPABASE_URL");
const LLAVE = entorno.get("SUPABASE_SERVICE_ROLE_KEY");

if (URL_BASE === undefined || LLAVE === undefined || LLAVE === "") {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

async function consultar(ruta) {
  const respuesta = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    headers: { apikey: LLAVE, authorization: `Bearer ${LLAVE}` },
  });
  if (!respuesta.ok) {
    throw new Error(`${ruta} respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
  return respuesta.json();
}

const [filasDePesos, noticias, interacciones] = await Promise.all([
  consultar("pesos_ranking?select=clave,valor&vigente_hasta=is.null"),
  consultar("vista_noticias_ranking?select=*"),
  consultar("vista_interacciones_ranking?select=*"),
]);

const pesos = interpretarPesos(
  filasDePesos.map((f) => ({ clave: f.clave, valor: Number(f.valor) })),
);

const porNoticia = new Map();
for (const fila of interacciones) {
  const lista = porNoticia.get(fila.id_noticia) ?? [];
  lista.push({
    tipo: fila.tipo,
    creadaEn: new Date(fila.creada_en),
    cuentaCreadaEn: new Date(fila.cuenta_creada_en),
    autoridad: fila.autoridad === null ? null : Number(fila.autoridad),
  });
  porNoticia.set(fila.id_noticia, lista);
}

const titulos = new Map(
  (await consultar("noticias?select=id,titulo")).map((n) => [n.id, n.titulo]),
);

const desgloses = noticias.map((n) =>
  calcularRelevancia(
    {
      idNoticia: n.id_noticia,
      estado: n.estado,
      publicadaEn: n.publicada_en === null ? null : new Date(n.publicada_en),
      credibilidadFuente:
        n.credibilidad_fuente === null ? null : Number(n.credibilidad_fuente),
      puntajeVeracidad: n.puntaje_veracidad === null ? null : Number(n.puntaje_veracidad),
      interacciones: porNoticia.get(n.id_noticia) ?? [],
    },
    pesos,
  ),
);

console.log("PESOS VIGENTES");
for (const [clave, valor] of Object.entries(pesos)) {
  console.log(`  ${clave.padEnd(16)} ${valor}`);
}

const feed = ordenarPorRelevancia(desgloses);

console.log(`\nFEED  (${feed.length} de ${desgloses.length} noticias entran)\n`);
feed.forEach((desglose, indice) => {
  const titulo = titulos.get(desglose.idNoticia) ?? desglose.idNoticia;
  console.log(`${indice + 1}. ${titulo}`);
  console.log(explicarRelevancia(desglose).split("\n").map((l) => `   ${l}`).join("\n"));
  console.log("");
});

const fuera = desgloses.filter((d) => !d.visible);
if (fuera.length > 0) {
  console.log("FUERA DEL FEED");
  for (const desglose of fuera) {
    console.log(`  · ${titulos.get(desglose.idNoticia) ?? desglose.idNoticia}`);
    console.log(`    ${explicarRelevancia(desglose)}`);
  }
  console.log("");
}

const sospechosas = desgloses.filter((d) => d.rafaga.sospechosa);
if (sospechosas.length > 0) {
  console.log("PARA LA COLA DE MODERACION (posible traccion coordinada)");
  for (const desglose of sospechosas) {
    console.log(`  · ${titulos.get(desglose.idNoticia) ?? desglose.idNoticia}`);
    console.log(`    ${desglose.rafaga.motivo}`);
  }
}
