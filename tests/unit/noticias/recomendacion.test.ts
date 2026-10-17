// ===========================================================================
// El canal recomienda; publica una persona (R-09)
//
// Lo que se comprueba es que ningún veredicto del canal lleva una noticia a la
// portada: esa transición es solo del moderador. Y que la cola sabe distinguir
// lo que el canal recomienda de lo que solo dejó en duda.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ESTADO_POR_VEREDICTO } from "../../../src/modules/noticias/servicio.ts";
import { recomendadaParaPublicar } from "../../../src/modules/noticias/recomendacion.ts";
import { UMBRAL_VERIFICADA } from "../../../src/modules/validacion/index.ts";

describe("lo que hace el canal con cada veredicto", () => {
  test("ningún veredicto publica: ninguno lleva a verificada", () => {
    for (const [veredicto, estado] of Object.entries(ESTADO_POR_VEREDICTO)) {
      assert.notEqual(estado, "verificada", `el veredicto «${veredicto}» publicaría solo`);
    }
  });

  test("lo que pasa el umbral queda en revisión, esperando a una persona", () => {
    assert.equal(ESTADO_POR_VEREDICTO.verificada, "en_revision");
  });

  test("en la dirección segura el canal sí decide solo", () => {
    assert.equal(ESTADO_POR_VEREDICTO.no_verificable, "no_verificable");
    assert.equal(ESTADO_POR_VEREDICTO.desmentida, "desmentida");
  });
});

describe("la recomendación en la cola de moderación", () => {
  test("en revisión y sobre el umbral: el canal la recomienda", () => {
    assert.equal(recomendadaParaPublicar("en_revision", UMBRAL_VERIFICADA), true);
    assert.equal(recomendadaParaPublicar("en_revision", 92), true);
  });

  test("en revisión pero bajo el umbral: es una duda, no una recomendación", () => {
    assert.equal(recomendadaParaPublicar("en_revision", UMBRAL_VERIFICADA - 1), false);
    assert.equal(recomendadaParaPublicar("en_revision", 55), false);
  });

  test("lo no verificable no se recomienda aunque el número sea alto", () => {
    assert.equal(recomendadaParaPublicar("no_verificable", 90), false);
  });

  test("sin puntaje no hay recomendación", () => {
    assert.equal(recomendadaParaPublicar("en_revision", null), false);
  });

  // La base puede devolver el número como texto (numeric de Postgres).
  test("acepta el puntaje como texto", () => {
    assert.equal(recomendadaParaPublicar("en_revision", "80"), true);
    assert.equal(recomendadaParaPublicar("en_revision", "abc"), false);
  });
});
