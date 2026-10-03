// ===========================================================================
// Las secciones
//
// La lista vive en dos lugares que no se pueden importar entre sí: el enum de
// la base y el módulo de TypeScript. Esta prueba lee la migración y los compara,
// para que agregar una sección en un solo lado falle aquí y no en un INSERT.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { interpretarSeccion, NOMBRE_DE_SECCION, SECCIONES } from "../../../src/lib/secciones.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function seccionesDeLaBase(): string[] {
  const sql = readFileSync(join(RAIZ, "supabase/migrations/20261002140000_portada.sql"), "utf8");
  const cuerpo = sql.match(/create type public\.seccion_noticia as enum \(([^)]*)\)/i)?.[1];
  assert.ok(cuerpo, "no encontré el enum seccion_noticia en la migración");
  return [...cuerpo.matchAll(/'([a-z_]+)'/g)].map((m) => m[1] as string);
}

describe("las secciones", () => {
  test("coinciden con el enum de la base, en el mismo orden", () => {
    assert.deepEqual(
      SECCIONES.map((s) => s.clave),
      seccionesDeLaBase(),
    );
  });

  test("cada una tiene nombre para mostrar", () => {
    for (const { clave } of SECCIONES) {
      assert.ok(NOMBRE_DE_SECCION[clave]?.length, clave);
    }
  });
});

describe("la lista blanca de lo que llega por la URL", () => {
  test("las secciones existentes pasan tal cual", () => {
    assert.equal(interpretarSeccion("deportes"), "deportes");
    assert.equal(interpretarSeccion("general"), "general");
  });

  // Todo esto puede venir en ?seccion=… y nada debe llegar a una consulta.
  test("lo desconocido devuelve null, no un texto", () => {
    for (const valor of [
      "farandula",
      "Deportes",
      " deportes",
      "deportes,mundo",
      "deportes' or '1'='1",
      "",
      undefined,
      null,
      42,
      ["deportes"],
    ]) {
      assert.equal(interpretarSeccion(valor), null, JSON.stringify(valor));
    }
  });
});
