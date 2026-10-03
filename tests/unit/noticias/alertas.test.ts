// ===========================================================================
// Lo que el moderador ve de las alertas de contenido
//
// La política de fila decide QUIÉN las lee. Esto decide QUÉ ve: qué se cuenta
// junto, qué se esconde, y con qué nombre llega la noticia.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { agruparAlertas, type FilaDeAlerta } from "../../../src/lib/alertas.ts";

const fila = (
  idNoticia: string,
  evidencia: string,
  detectadaEn: string,
  estado = "verificada",
  comprobacion = "sin_dominios_ajenos",
): FilaDeAlerta => ({
  id_noticia: idNoticia,
  comprobacion,
  evidencia,
  detectada_en: detectadaEn,
  noticias: {
    titulo: `Titular de ${idNoticia}`,
    estado,
    autor: { nombre: "Beto Publicador" },
    fuentes: null,
  },
});

describe("las alertas, agrupadas para el moderador", () => {
  test("una entrada por noticia, con cada evidencia y cuántas veces apareció", () => {
    const alertas = agruparAlertas([
      fila("n-1", "ejemplo-malicioso.com", "2026-10-03T12:00:00Z"),
      fila("n-1", "ejemplo-malicioso.com", "2026-10-03T11:00:00Z"),
      fila("n-1", "veracidad 100", "2026-10-03T10:00:00Z", "verificada", "veracidad_no_inventada"),
      fila("n-2", "otro-sitio.com", "2026-10-03T09:00:00Z"),
    ]);

    assert.equal(alertas.length, 2);
    const primera = alertas.find((a) => a.idNoticia === "n-1");
    assert.equal(primera?.veces, 3);
    assert.deepEqual(primera?.evidencias, [
      { comprobacion: "sin_dominios_ajenos", evidencia: "ejemplo-malicioso.com", veces: 2 },
      { comprobacion: "veracidad_no_inventada", evidencia: "veracidad 100", veces: 1 },
    ]);
  });

  test("la última vez es la detección más reciente", () => {
    const [alerta] = agruparAlertas([
      fila("n-1", "a.com", "2026-10-03T12:00:00Z"),
      fila("n-1", "a.com", "2026-10-01T08:00:00Z"),
    ]);
    assert.equal(alerta?.ultimaVez, "2026-10-03T12:00:00Z");
  });

  // Si un moderador ya la sacó de publicación, la alerta no pide nada más.
  test("las noticias que ya no están publicadas no aparecen", () => {
    const alertas = agruparAlertas([
      fila("n-1", "a.com", "2026-10-03T12:00:00Z", "archivada"),
      fila("n-2", "b.com", "2026-10-03T12:00:00Z", "no_verificable"),
      fila("n-3", "c.com", "2026-10-03T12:00:00Z"),
    ]);
    assert.deepEqual(alertas.map((a) => a.idNoticia), ["n-3"]);
  });

  test("la alerta llega con el nombre de quien publicó", () => {
    const [alerta] = agruparAlertas([fila("n-1", "a.com", "2026-10-03T12:00:00Z")]);
    assert.equal(alerta?.autor, "Beto Publicador");
  });

  test("una noticia que se borró no rompe la lista", () => {
    const huerfana: FilaDeAlerta = { ...fila("n-1", "a.com", "2026-10-03T12:00:00Z"), noticias: null };
    assert.deepEqual(agruparAlertas([huerfana]), []);
  });
});
