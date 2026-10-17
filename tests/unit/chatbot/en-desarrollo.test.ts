// ===========================================================================
// Lo no confirmado se dice (R-13)
//
// Si una respuesta cita una noticia publicada en desarrollo, dice que no está
// confirmada y no sale con confianza alta. No depende del modelo: lo agrega
// el servidor después de la capa 3.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { avisarLoNoConfirmado } from "../../../src/modules/chatbot/en-desarrollo.ts";
import { delimitarAcervo } from "../../../src/modules/chatbot/prompt.ts";
import type { NoticiaParaElModelo } from "../../../src/modules/chatbot/index.ts";

const noticia = (id: string, titulo: string, enDesarrollo: boolean): NoticiaParaElModelo => ({
  id,
  titulo,
  resumen: "Resumen de prueba.",
  publicadaEn: "2026-10-16T10:00:00Z",
  fuente: "Prensa Libre",
  puntajeVeracidad: 80,
  relevancia: 1,
  enDesarrollo,
});

const SISMO = noticia("n-1", "Sismo de 5.8 sacude el occidente", true);
const PRESUPUESTO = noticia("n-2", "El Congreso aprueba el presupuesto", false);

describe("la respuesta que cita algo en desarrollo", () => {
  test("lo dice con palabras, nombrando la noticia", () => {
    const r = avisarLoNoConfirmado("Hubo un sismo fuerte esta mañana.", "alta", ["n-1"], [SISMO, PRESUPUESTO]);
    assert.match(r.respuesta, /Sismo de 5\.8 sacude el occidente/);
    assert.match(r.respuesta, /en desarrollo/);
    assert.match(r.respuesta, /no está confirmado/);
  });

  test("no sale con confianza alta", () => {
    assert.equal(avisarLoNoConfirmado("Hubo un sismo.", "alta", ["n-1"], [SISMO]).confianza, "media");
    assert.equal(avisarLoNoConfirmado("Hubo un sismo.", "baja", ["n-1"], [SISMO]).confianza, "baja");
  });

  test("si el modelo ya lo dijo, no lo repite", () => {
    const texto = "Hay reportes de un sismo, todavía en desarrollo.";
    const r = avisarLoNoConfirmado(texto, "media", ["n-1"], [SISMO]);
    assert.equal(r.respuesta, texto);
  });

  test("con dos en desarrollo, nombra las dos", () => {
    const otra = noticia("n-3", "Cierre de la ruta al Pacífico", true);
    const r = avisarLoNoConfirmado("Dos cosas pasan hoy.", "media", ["n-1", "n-3"], [SISMO, otra]);
    assert.match(r.respuesta, /«Sismo de 5\.8 sacude el occidente» y «Cierre de la ruta al Pacífico» están en desarrollo/);
  });
});

describe("la respuesta que no cita nada en desarrollo", () => {
  test("queda igual, con su confianza", () => {
    const texto = "El Congreso aprobó el presupuesto.";
    assert.deepEqual(avisarLoNoConfirmado(texto, "alta", ["n-2"], [SISMO, PRESUPUESTO]), {
      respuesta: texto,
      confianza: "alta",
    });
  });

  // Que una noticia en desarrollo esté en el contexto no basta: tiene que estar citada.
  test("una en desarrollo que no se citó no agrega nada", () => {
    const texto = "El Congreso aprobó el presupuesto.";
    assert.equal(avisarLoNoConfirmado(texto, "alta", ["n-2"], [SISMO, PRESUPUESTO]).respuesta, texto);
  });
});

describe("lo que ve el modelo", () => {
  test("la noticia en desarrollo lo trae como dato, y las demás no traen nada", () => {
    const acervo = delimitarAcervo([SISMO, PRESUPUESTO], "marca");
    const [bloqueSismo, bloquePresupuesto] = acervo.split("</noticia>");
    assert.match(bloqueSismo!, /estado: en desarrollo \(no confirmada\)/);
    assert.doesNotMatch(bloquePresupuesto!, /en desarrollo/);
  });
});

// Lo que pasó en producción: el modelo expresó la duda sin decir que estaba en desarrollo.
test("dudar no alcanza: si no dice «en desarrollo», se agrega", () => {
  const texto = "No hay respaldo suficiente para confirmar el corte.";
  const r = avisarLoNoConfirmado(texto, "baja", ["n-1"], [SISMO]);
  assert.match(r.respuesta, /Sismo de 5\.8 sacude el occidente» está en desarrollo/);
});
