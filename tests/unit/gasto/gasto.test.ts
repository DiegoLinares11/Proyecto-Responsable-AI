// ===========================================================================
// El panel de gasto (R-11)
//
// Lo que se comprueba es la cuenta: el total viene de la vista del tope, el
// margen nunca es negativo y cada turno cae en la función a la que llegó. Que
// el desglose sume lo mismo que el total lo prueba la sección 18 de la suite de
// RLS, contra la base.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { resumirGasto, type FilaDeGastoPorModelo } from "../../../src/modules/gasto/index.ts";

const GUARDIAS = ["gpt-6-luna", "claude-haiku-4-5"];

const POR_MODELO: FilaDeGastoPorModelo[] = [
  { modelo: null, turnos: 3, gasto_usd: 0, promedio_usd: 0 },
  { modelo: "gpt-6-luna", turnos: 4, gasto_usd: "0.0004", promedio_usd: "0.0001" },
  { modelo: "gpt-6.1-sol", turnos: 6, gasto_usd: "0.030", promedio_usd: "0.005" },
];

const resumen = (cambios: Partial<Parameters<typeof resumirGasto>[0]> = {}) =>
  resumirGasto({
    total: { gasto_usd: "0.0304", turnos: 10 },
    porModelo: POR_MODELO,
    topeUsd: 4,
    creditoUsd: 5,
    modelosDeGuardia: GUARDIAS,
    ...cambios,
  });

describe("el total y el margen", () => {
  test("el total es el de la vista del tope, no una suma propia", () => {
    const r = resumen();
    assert.equal(r.gastoUsd, 0.0304);
    assert.equal(r.turnos, 10);
  });

  test("el margen es lo que falta para que el tope corte", () => {
    const r = resumen();
    assert.ok(Math.abs(r.margenUsd - 3.9696) < 1e-9);
    assert.ok(Math.abs(r.usoDelTope - 0.0076) < 1e-9);
  });

  test("pasado el tope, el margen es cero y el uso 100 %, nunca negativo", () => {
    const r = resumen({ total: { gasto_usd: 4.5, turnos: 900 } });
    assert.equal(r.margenUsd, 0);
    assert.equal(r.usoDelTope, 1);
    assert.equal(r.respuestasRestantes, 0);
  });

  test("el crédito se muestra solo si se configuró", () => {
    assert.equal(resumen().creditoUsd, 5);
    assert.equal(resumen({ creditoUsd: null }).creditoUsd, null);
  });
});

describe("cuánto cuesta cada función", () => {
  test("cada turno cae en la función a la que llegó, en orden", () => {
    const r = resumen();
    assert.deepEqual(
      r.porFuncion.map((f) => [f.funcion, f.turnos]),
      [
        ["filtro", 3],
        ["clasificador", 4],
        ["respuesta", 6],
      ],
    );
  });

  test("el filtro previo es gratis", () => {
    const filtro = resumen().porFuncion.find((f) => f.funcion === "filtro")!;
    assert.equal(filtro.gastoUsd, 0);
    assert.equal(filtro.promedioUsd, 0);
  });

  test("el promedio de la respuesta incluye al clasificador y da las respuestas que caben", () => {
    const r = resumen();
    const respuesta = r.porFuncion.find((f) => f.funcion === "respuesta")!;
    assert.ok(Math.abs(respuesta.promedioUsd - 0.005) < 1e-12);
    assert.equal(r.respuestasRestantes, Math.floor(r.margenUsd / 0.005));
  });

  // Si el proyecto cambia de proveedor, los turnos de los dos conviven.
  test("los modelos de guardia de los dos proveedores cuentan como clasificador", () => {
    const r = resumen({
      porModelo: [
        { modelo: "claude-haiku-4-5", turnos: 2, gasto_usd: 0.0008, promedio_usd: 0.0004 },
        { modelo: "gpt-6-luna", turnos: 2, gasto_usd: 0.0002, promedio_usd: 0.0001 },
      ],
    });
    const clasificador = r.porFuncion.find((f) => f.funcion === "clasificador")!;
    assert.equal(clasificador.turnos, 4);
    assert.deepEqual(clasificador.modelos.sort(), ["claude-haiku-4-5", "gpt-6-luna"]);
  });

  test("sin respuestas todavía, no inventa cuántas caben", () => {
    const r = resumen({ porModelo: [{ modelo: null, turnos: 1, gasto_usd: 0, promedio_usd: 0 }] });
    assert.equal(r.respuestasRestantes, null);
  });
});
