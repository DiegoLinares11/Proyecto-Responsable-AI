// ===========================================================================
// Corre el canal de validación sobre una noticia y resuelve su estado.
//
//   node scripts/validar_noticia.mjs <id-de-noticia>
//   node scripts/validar_noticia.mjs <url-de-un-articulo>
//
// Con una URL, crea el borrador leyendo los metadatos del artículo y después lo
// valida — que es el camino completo de punta a punta.
//
// ⚠ El borrador se crea aquí con la llave de servicio, que SE SALTA las
// políticas de fila. Eso es un atajo de este script, no del sistema: la ruta de
// la aplicación lo crea con la sesión del publicador, y que ahí haga falta el
// permiso `noticias_publicar` lo comprueban las aserciones de tests/rls/. Este
// script existe para ejercitar la validación, no el control de accesos.
// ===========================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { validarYResolver } from "../src/modules/noticias/index.ts";
import { crearTraerUrl, leerMetadatos } from "../src/modules/validacion/index.ts";

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

const argumento = process.argv[2];
if (argumento === undefined) {
  console.error("Uso: node scripts/validar_noticia.mjs <id-de-noticia | url>");
  process.exit(2);
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let idNoticia;

if (ES_UUID.test(argumento)) {
  idNoticia = argumento;
} else {
  console.log(`leyendo ${argumento} ...`);
  const { estado, html } = await crearTraerUrl()(argumento);
  if (estado < 200 || estado >= 300) {
    console.error(`La URL respondió ${estado}; no hay artículo del que armar el borrador.`);
    process.exit(1);
  }

  const metadatos = leerMetadatos(html);
  if (metadatos.titulo === null) {
    console.error("La página no expone un titular legible en sus metadatos.");
    process.exit(1);
  }

  const resumen =
    metadatos.descripcion ??
    `${metadatos.titulo}. Resumen tomado del articulo original para la prueba del canal.`;

  const { data, error } = await cliente
    .from("noticias")
    .insert({
      titulo: metadatos.titulo.slice(0, 300),
      resumen: resumen.slice(0, 1000),
      cuerpo: `${metadatos.titulo}. ${resumen} `.repeat(3),
      url_original: argumento,
      id_autor: "dddddddd-0000-0000-0000-000000000001",
      estado: "borrador",
    })
    .select("id")
    .single();

  if (error !== null) {
    console.error(`No se pudo crear el borrador: ${error.message}`);
    process.exit(1);
  }

  idNoticia = data.id;
  console.log(`borrador creado: ${idNoticia}`);
  console.log(`titular        : ${metadatos.titulo}\n`);
}

const inicio = Date.now();
const resultado = await validarYResolver(cliente, idNoticia, {
  llaveFactCheck: process.env.GOOGLE_FACT_CHECK_API_KEY || undefined,
  // Sin llave de fact-check, exigirlo dejaría todo en revisión por diseño. Se
  // relaja a propósito para poder ver el resto del canal, y la señal lo registra.
  exigirVerificadorDeHechos: Boolean(process.env.GOOGLE_FACT_CHECK_API_KEY),
});

const { veredicto } = resultado;

console.log(`${resultado.estadoAnterior}  ->  ${resultado.estadoNuevo}`);
console.log(`PUNTAJE : ${veredicto.puntaje} / 100   (${Date.now() - inicio} ms)`);
console.log(`MOTIVO  : ${veredicto.motivo}\n`);

for (const senal of veredicto.senales) {
  console.log(
    `${senal.disponible ? " " : "?"} ${senal.senal.padEnd(21)} ` +
      `${String(senal.aporte).padStart(6)}/${String(senal.maximo).padEnd(3)} ${senal.detalle.resultado}`,
  );
  console.log(`    ${String(senal.detalle.explicacion).slice(0, 160)}`);
}

const { count } = await cliente
  .from("validaciones")
  .select("*", { count: "exact", head: true })
  .eq("id_noticia", idNoticia);

console.log(`\nfilas en validaciones para esta noticia: ${count}`);
