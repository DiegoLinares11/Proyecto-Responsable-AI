// ===========================================================================
// El chat es temporal (R-04)
//
// Lo que se comprueba es lo que llega a la base de cada turno: los metadatos
// que necesitan los topes y la auditoría, y nada del texto. Ni lo que escribió
// la persona, ni lo que respondió el asistente, ni el razonamiento del
// clasificador, que parafrasea lo primero. La otra mitad —que la base ni
// siquiera tiene la columna— la prueba la sección 17 de la suite de RLS.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { filasDelTurno, motivoParaGuardar } from "../../../src/app/api/chat/puertos.ts";
import type { TurnoRegistrado } from "../../../src/modules/chatbot/index.ts";

const MENSAJE = "Contame de la tasa de interés, mi hija está enferma y necesito saber";
const RESPUESTA = "La Junta Monetaria mantuvo la tasa líder en 4.5 %.";

const turno = (cambios: Partial<TurnoRegistrado> = {}): TurnoRegistrado => ({
  idConversacion: "c-1",
  mensajeDelUsuario: MENSAJE,
  respuesta: RESPUESTA,
  bloqueado: false,
  capaQueCorto: null,
  motivoBloqueo: null,
  categoria: "consulta_noticias",
  sospechas: [],
  noticiasCitadas: ["n-1"],
  confianza: "alta",
  costo: {
    modelo: "gpt-6.1-sol",
    tokensEntrada: 1000,
    tokensSalida: 80,
    tokensCache: 0,
    costoUsd: 0.003,
    latenciaMs: 1200,
  },
  ...cambios,
});

describe("lo que se guarda de un turno", () => {
  test("ninguna fila trae el texto: ni la pregunta ni la respuesta", () => {
    const filas = filasDelTurno(turno());
    assert.equal(filas.length, 2);
    for (const fila of filas) {
      assert.equal("contenido" in fila, false);
      const todo = JSON.stringify(fila);
      assert.equal(todo.includes("tasa de interés"), false);
      assert.equal(todo.includes("Junta Monetaria"), false);
    }
  });

  test("quedan los metadatos de los topes: rol, modelo y costo", () => {
    const [usuario, asistente] = filasDelTurno(turno());
    assert.equal(usuario!.rol, "usuario");
    assert.equal(asistente!.rol, "asistente");
    assert.equal(asistente!.modelo, "gpt-6.1-sol");
    assert.equal(asistente!.costo_usd, 0.003);
    assert.deepEqual(asistente!.noticias_citadas, ["n-1"]);
  });

  // PostgREST rechaza una inserción múltiple si las filas no tienen las
  // mismas claves («All object keys must match»).
  test("las dos filas tienen exactamente las mismas claves", () => {
    const [usuario, asistente] = filasDelTurno(turno());
    assert.deepEqual(Object.keys(usuario!).sort(), Object.keys(asistente!).sort());
  });
});

describe("el motivo de un bloqueo", () => {
  test("de la capa 1 se guarda solo la categoría, sin el razonamiento", () => {
    const t = turno({
      bloqueado: true,
      capaQueCorto: "capa1",
      categoria: "intento_desvio",
      motivoBloqueo: "Clasificado como intento_desvio: el usuario pide una linked list en Java",
    });
    assert.equal(motivoParaGuardar(t), "Clasificado como intento_desvio");
    const [, asistente] = filasDelTurno(t);
    assert.equal(asistente!.motivo_bloqueo, "Clasificado como intento_desvio");
    assert.equal(JSON.stringify(filasDelTurno(t)).includes("linked list"), false);
  });

  test("los de la capa 0 son frases fijas y quedan como están", () => {
    const t = turno({ bloqueado: true, capaQueCorto: "capa0", motivoBloqueo: "El mensaje está vacío." });
    assert.equal(motivoParaGuardar(t), "El mensaje está vacío.");
  });

  test("los de la capa 3 hablan de la respuesta y quedan como están", () => {
    const motivo = "Afirma puntajes de veracidad que ninguna noticia del contexto tiene: 100.";
    const t = turno({ bloqueado: true, capaQueCorto: "capa3", motivoBloqueo: motivo });
    assert.equal(motivoParaGuardar(t), motivo);
  });

  test("sin bloqueo no hay motivo", () => {
    assert.equal(motivoParaGuardar(turno()), null);
  });
});
