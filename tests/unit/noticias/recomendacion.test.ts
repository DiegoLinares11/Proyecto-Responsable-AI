// ===========================================================================
// El canal recomienda; publica una persona (R-09)
//
// Lo que se comprueba es que ningún veredicto del canal lleva una noticia a la
// portada: esa transición es solo del moderador. Y que la cola sabe distinguir
// lo que el canal recomienda de lo que solo dejó en duda.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { cambioDeLaDecision, ESTADO_POR_VEREDICTO } from "../../../src/modules/noticias/servicio.ts";
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

describe("lo que cambia cada decisión del moderador (R-13)", () => {
  const AHORA = new Date("2026-10-16T12:00:00Z");

  test("publicar en desarrollo publica y deja la marca", () => {
    assert.deepEqual(cambioDeLaDecision("aprobar_en_desarrollo", AHORA), {
      estado: "verificada",
      publicada_en: AHORA.toISOString(),
      en_desarrollo: true,
    });
  });

  test("publicar normal deja la marca apagada", () => {
    assert.equal(cambioDeLaDecision("aprobar", AHORA)["en_desarrollo"], false);
  });

  // La noticia ya estaba publicada: su fecha no cambia al confirmarla.
  test("confirmar solo quita la marca, sin tocar el estado ni la fecha", () => {
    assert.deepEqual(cambioDeLaDecision("confirmar", AHORA), { en_desarrollo: false });
  });

  // La base solo acepta la marca en una publicada: sacarla tiene que quitarla.
  test("rechazar y archivar quitan la marca en el mismo cambio", () => {
    assert.equal(cambioDeLaDecision("rechazar", AHORA)["en_desarrollo"], false);
    assert.equal(cambioDeLaDecision("archivar", AHORA)["en_desarrollo"], false);
  });
});
