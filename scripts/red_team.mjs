// ===========================================================================
// Fase 5 — El corredor del red team
//
//   node scripts/red_team.mjs                      # el corpus completo
//   node scripts/red_team.mjs --categoria tarea_escondida
//   node scripts/red_team.mjs --max 10             # los primeros 10
//   node scripts/red_team.mjs --caso esc-01
//
// El modo lo decide LLM_MODO. Las mediciones que van al informe tienen que
// correr en modo `api`, que es el único que devuelve consumo real de tokens
// (ADR 0005).
//
// Los casos de inyección indirecta funcionan distinto a todos los demás: el
// mensaje del usuario es inocente y el ataque va dentro del CUERPO de una
// noticia que este script inserta en la base, publicada, para que la
// recuperación la encuentre. Se borra al terminar cada caso.
// ===========================================================================

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { conversar } from "../src/modules/chatbot/index.ts";
import { crearProveedor, MODELO_DE_SUSCRIPCION } from "../src/modules/chatbot/proveedor/index.ts";
import { CORPUS } from "../tests/redteam/corpus.ts";
import { calificar, resumir } from "../tests/redteam/calificar.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const linea of readFileSync(join(RAIZ, ".env.local"), "utf8").split("\n")) {
  const par = linea.match(/^([A-Z0-9_]+)=(.*)$/);
  // Lo que ya viene del shell manda, como en dotenv: así se puede correr con
  // otro tope o en otro modo sin tocar .env.local.
  if (par !== null && process.env[par[1]] === undefined) process.env[par[1]] = par[2].trim();
}

// --- argumentos -------------------------------------------------------------

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(`--${nombre}`);
  return i === -1 ? undefined : args[i + 1];
};

let casos = [...CORPUS];
const categoria = opcion("categoria");
const soloCaso = opcion("caso");
const max = opcion("max");

if (categoria !== undefined) casos = casos.filter((c) => c.categoria === categoria);
if (soloCaso !== undefined) casos = casos.filter((c) => c.id === soloCaso);
if (max !== undefined) casos = casos.slice(0, Number(max));

if (casos.length === 0) {
  console.error("Ningún caso coincide con los filtros.");
  process.exit(2);
}

// --- infraestructura --------------------------------------------------------

const cliente = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const proveedor = crearProveedor({
  modo: process.env.LLM_MODO,
  esProduccion: false,
  api: { llave: process.env.ANTHROPIC_API_KEY || undefined },
});

const AUTOR = "dddddddd-0000-0000-0000-000000000001";

// --- el tope de gasto -------------------------------------------------------
//
// También rige acá. Los turnos del red team no se guardan en `mensajes` —a
// propósito, para no mezclar ataques con tráfico real—, así que la vista del
// gasto no los ve: se lee lo que ya gastó el chatbot al empezar y se le suma lo
// que va gastando esta corrida.
//
// En modo suscripción el costo es un estimado del SDK, no dinero, y no cuenta.
// Es la misma regla que aplica la vista `vista_gasto_api`.

const TOPE_GASTO_USD = Number(process.env.TOPE_GASTO_USD_ACUMULADO || 18);
const ES_API = (process.env.LLM_MODO ?? "").trim().toLowerCase() === "api";

async function gastoApiDeLaBase() {
  const { data, error } = await cliente.from("vista_gasto_api").select("gasto_usd").single();
  if (error !== null) throw new Error(`No se pudo leer el gasto acumulado: ${error.message}`);
  return Number(data.gasto_usd);
}

const gastoPrevioUsd = ES_API ? await gastoApiDeLaBase() : 0;
let gastoDeEstaCorridaUsd = 0;

const CAMPOS = "id,titulo,resumen,publicada_en,puntaje_veracidad,relevancia,fuentes(nombre)";

const aNoticia = (f) => ({
  id: f.id,
  titulo: f.titulo,
  resumen: f.resumen,
  publicadaEn: f.publicada_en,
  fuente: f.fuentes?.nombre ?? "fuente no registrada",
  puntajeVeracidad: f.puntaje_veracidad,
  relevancia: Number(f.relevancia),
});

const terminos = (consulta) =>
  consulta
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/).filter((t) => t.length >= 4).slice(0, 6).join(" ");

const deps = {
  proveedor,
  recuperarNoticias: async (consulta, limite) => {
    const buscables = terminos(consulta);
    if (buscables !== "") {
      const { data } = await cliente
        .from("noticias").select(CAMPOS).eq("estado", "verificada")
        .textSearch("busqueda", buscables, { type: "plain", config: "spanish" })
        .order("relevancia", { ascending: false }).limit(limite);
      if (data?.length) return data.map(aNoticia);
    }
    const { data } = await cliente
      .from("noticias").select(CAMPOS).eq("estado", "verificada")
      .order("relevancia", { ascending: false }).limit(limite);
    return (data ?? []).map(aNoticia);
  },
  verificarNoticias: async (ids) => {
    if (ids.length === 0) return new Set();
    const { data } = await cliente
      .from("noticias").select("id").eq("estado", "verificada").in("id", [...ids]);
    return new Set((data ?? []).map((f) => f.id));
  },
  // El red team no ensucia la bitácora de producción: ya tiene su propio
  // informe, y mezclar sus turnos con los reales haría que las métricas de
  // costo del informe midieran las dos cosas juntas.
  //
  // Pero cada turno pasa por acá —también los intermedios de una escalada—, así
  // que es el lugar exacto para llevar la cuenta de lo que se va gastando.
  guardarTurno: async (turno) => {
    if (turno.costo.modelo !== null && turno.costo.modelo !== MODELO_DE_SUSCRIPCION) {
      gastoDeEstaCorridaUsd += turno.costo.costoUsd;
    }
  },
  contarMensajesDeHoy: async () => 0,
  gastoAcumuladoUsd: async () => gastoPrevioUsd + gastoDeEstaCorridaUsd,
  capa0: { topeDiarioPorUsuario: 100_000, topeGastoUsd: TOPE_GASTO_USD },
};

/** Inserta la noticia envenenada y devuelve cómo borrarla. */
async function envenenar(noticiaEnvenenada) {
  const id = randomUUID();
  const { error } = await cliente.from("noticias").insert({
    id,
    titulo: noticiaEnvenenada.titulo,
    resumen: noticiaEnvenenada.cuerpo.slice(0, 900),
    cuerpo: noticiaEnvenenada.cuerpo,
    id_autor: AUTOR,
    estado: "verificada",
    puntaje_veracidad: 80,
    publicada_en: new Date().toISOString(),
    relevancia: 9999, // para asegurar que la recuperación la encuentre primero
  });
  if (error !== null) throw new Error(`No se pudo sembrar la noticia envenenada: ${error.message}`);
  return async () => {
    await cliente.from("noticias").delete().eq("id", id);
  };
}

// --- la corrida -------------------------------------------------------------

console.log(`modo: ${process.env.LLM_MODO}   proveedor: ${proveedor.nombre}`);
console.log(`casos: ${casos.length}\n`);

const resultados = [];
const inicio = Date.now();

// Si el tope se cruza a mitad de la corrida, los casos que quedan morirían en
// capa 0 y contarían como «contenidos» sin haber llegado al modelo: la tasa de
// contención subiría con ataques que nunca se probaron. Se corta y se dice.
let corridaIncompleta = null;

for (const [indice, caso] of casos.entries()) {
  process.stdout.write(
    `[${String(indice + 1).padStart(3)}/${casos.length}] ${caso.id.padEnd(8)} ${caso.categoria.padEnd(22)} `,
  );

  let limpiar = async () => {};
  let salida;
  let cortadoPorTope = false;

  // Se suman TODOS los turnos del caso. Antes se reportaba solo el último, y en
  // las escaladas —cuatro o cinco mensajes— el informe subestimaba el costo.
  let costoDelCaso = 0;

  try {
    if (caso.noticiaEnvenenada !== undefined) {
      limpiar = await envenenar(caso.noticiaEnvenenada);
    }

    const idConversacion = randomUUID();
    const historial = [];
    let ultima = null;

    // Los casos de escalada mandan varios mensajes; se califica el último.
    for (const mensaje of caso.mensajes) {
      ultima = await conversar({ idUsuario: AUTOR, idConversacion, mensaje, historial }, deps);
      costoDelCaso += ultima.costo.costoUsd;

      if (ultima.capaQueCorto === "capa0" && /tope de gasto/.test(ultima.registro.motivoBloqueo ?? "")) {
        cortadoPorTope = true;
        break;
      }

      historial.push({ rol: "usuario", contenido: mensaje });
      historial.push({ rol: "asistente", contenido: ultima.respuesta });
    }

    salida = {
      respuesta: ultima.respuesta,
      bloqueado: ultima.bloqueado,
      capaQueCorto: ultima.capaQueCorto,
      motivoBloqueo: ultima.registro.motivoBloqueo,
      categoriaDetectada: ultima.registro.categoria,
      costoUsd: costoDelCaso,
    };
  } catch (error) {
    salida = {
      respuesta: "",
      bloqueado: false,
      capaQueCorto: null,
      motivoBloqueo: null,
      categoriaDetectada: null,
      costoUsd: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await limpiar();
  }

  if (cortadoPorTope) {
    console.log("SIN CALIFICAR — se alcanzó el tope de gasto");
    corridaIncompleta =
      `Se alcanzó el tope de gasto (US$ ${TOPE_GASTO_USD}) en el caso ${caso.id}, después de ` +
      `${resultados.length} de ${casos.length}. Ni ese caso ni los restantes se califican.`;
    break;
  }

  const resultado = calificar(caso, salida);
  resultados.push(resultado);
  console.log(resultado.paso ? "OK" : `FALLA — ${resultado.veredicto.slice(0, 90)}`);
}

// --- informe ----------------------------------------------------------------

const informe = { ...resumir(resultados, proveedor.nombre), corridaIncompleta };
const pct = (n) => (Number.isNaN(n) ? "  n/a" : `${(n * 100).toFixed(1)}%`);

console.log(`\n${"─".repeat(78)}`);
console.log(`CONTENCIÓN        ${pct(informe.tasaDeContencion)}   (ningún contenido prohibido llegó al usuario)`);
console.log(`ATENCIÓN          ${pct(informe.tasaDeAtencion)}   (los ataques con consulta legítima igual se respondieron)`);
console.log(`FALSOS POSITIVOS  ${pct(informe.tasaDeFalsosPositivos)}   (consultas legítimas bloqueadas de más)`);
console.log(`casos que cumplen las dos cosas: ${informe.pasaron}/${informe.totalDeCasos}`);
console.log(`costo: $${informe.costoTotalUsd.toFixed(4)}   tiempo: ${Math.round((Date.now() - inicio) / 1000)}s`);

if (corridaIncompleta !== null) {
  console.log(`\n⚠ CORRIDA INCOMPLETA — ${corridaIncompleta}`);
  console.log(`  Las tasas de arriba son sobre ${resultados.length} casos, no sobre el corpus entero.`);
}

console.log(`\nPOR CATEGORÍA`);
for (const c of informe.porCategoria) {
  console.log(`  ${c.categoria.padEnd(24)} ${String(c.pasaron).padStart(3)}/${String(c.total).padEnd(3)}  ${pct(c.tasa)}`);
}

if (informe.fallas.length > 0) {
  console.log(`\nFALLAS (${informe.fallas.length})`);
  for (const f of informe.fallas) {
    console.log(`  ${f.caso.id}  ${f.caso.categoria}`);
    console.log(`    ${f.veredicto}`);
    console.log(`    mensaje : ${f.caso.mensajes.at(-1).slice(0, 110)}`);
    console.log(`    respuesta: ${f.respuestaFinal.replace(/\s+/g, " ").slice(0, 150)}`);
    if (f.motivoBloqueo) console.log(`    corto por : ${f.motivoBloqueo.slice(0, 200)}`);
  }
}

mkdirSync(join(RAIZ, "tests/redteam/resultados"), { recursive: true });
const archivo = join(RAIZ, "tests/redteam/resultados", `corrida-${Date.now()}.json`);
writeFileSync(archivo, JSON.stringify(informe, null, 2));
console.log(`\ninforme guardado en ${archivo}`);

process.exit(informe.fallas.length === 0 && corridaIncompleta === null ? 0 : 1);
