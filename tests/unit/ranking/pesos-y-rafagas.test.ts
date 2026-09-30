// ===========================================================================
// Fase 3 — Pesos configurables y detección de ráfagas
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  crearCargadorDePesos,
  detectarRafaga,
  interpretarPesos,
  PesosInvalidos,
  DIAS_PARA_MADURAR,
  type FilaDePeso,
  type InteraccionDeRanking,
} from "../../../src/modules/ranking/index.ts";

const COMPLETOS: FilaDePeso[] = [
  { clave: "w_interaccion", valor: 1 },
  { clave: "w_verificadas", valor: 1.5 },
  { clave: "w_fuente", valor: 20 },
  { clave: "w_veracidad", valor: 25 },
  { clave: "gravedad", valor: 1.5 },
];

describe("pesos", () => {
  test("interpreta las filas de la base", () => {
    const pesos = interpretarPesos(COMPLETOS);
    assert.equal(pesos.w_fuente, 20);
    assert.equal(pesos.gravedad, 1.5);
  });

  // Con cuatro pesos de cinco el ranking no es «casi el configurado»: es otro
  // ranking, y nadie eligio ese. Un error al arrancar se arregla; un orden
  // distinto sin que nadie lo decidiera, no se nota.
  test("falla ruidosamente si falta un peso, en vez de rellenarlo", () => {
    const incompletos = COMPLETOS.filter((f) => f.clave !== "gravedad");
    assert.throws(() => interpretarPesos(incompletos), (e: Error) => {
      assert.ok(e instanceof PesosInvalidos);
      assert.match(e.message, /gravedad/);
      return true;
    });
  });

  test("avisa si la base trae pesos que la formula no usa", () => {
    assert.throws(
      () => interpretarPesos([...COMPLETOS, { clave: "w_inventado", valor: 3 }]),
      /w_inventado/,
    );
  });

  test("rechaza un peso negativo", () => {
    const conNegativo = COMPLETOS.map((f) =>
      f.clave === "w_fuente" ? { ...f, valor: -20 } : f,
    );
    assert.throws(() => interpretarPesos(conNegativo), /negativo/);
  });

  test("rechaza gravedad cero, porque apaga el decaimiento", () => {
    const sinDecaimiento = COMPLETOS.map((f) =>
      f.clave === "gravedad" ? { ...f, valor: 0 } : f,
    );
    assert.throws(() => interpretarPesos(sinDecaimiento), /mayor que cero/);
  });

  test("rechaza un valor que no es numero finito", () => {
    const roto = COMPLETOS.map((f) =>
      f.clave === "w_veracidad" ? { ...f, valor: Number.NaN } : f,
    );
    assert.throws(() => interpretarPesos(roto), /finito/);
  });

  test("el resultado es inmutable", () => {
    const pesos = interpretarPesos(COMPLETOS);
    assert.throws(() => {
      (pesos as { w_fuente: number }).w_fuente = 99;
    });
  });

  test("no consulta la base en cada calculo", async () => {
    let consultas = 0;
    let t = 0;
    const cargar = crearCargadorDePesos(
      async () => {
        consultas++;
        return COMPLETOS;
      },
      { vidaDeCacheMs: 1000, ahora: () => t },
    );

    await cargar();
    await cargar();
    await cargar();
    assert.equal(consultas, 1);

    t = 2000; // se vence la cache
    await cargar();
    assert.equal(consultas, 2);
  });
});

// ---------------------------------------------------------------------------

const AHORA = new Date("2026-09-30T12:00:00.000Z");

function interacciones(
  cuantas: number,
  opciones: { enMinutos: number; diasDeLaCuenta: number },
): InteraccionDeRanking[] {
  return Array.from({ length: cuantas }, (_, i) => ({
    tipo: "reaccion" as const,
    creadaEn: new Date(AHORA.getTime() - ((i * opciones.enMinutos) / cuantas) * 60_000),
    cuentaCreadaEn: new Date(AHORA.getTime() - opciones.diasDeLaCuenta * 86_400_000),
    autoridad: null,
  }));
}

describe("rafagas", () => {
  test("poco volumen nunca es sospechoso", () => {
    const r = detectarRafaga(interacciones(5, { enMinutos: 5, diasDeLaCuenta: 0 }), AHORA);
    assert.equal(r.sospechosa, false);
  });

  // Una noticia importante recibe muchas interacciones rapido. Eso no es un
  // ataque, y marcarlo como tal seria peor que no marcar nada.
  test("un pico desde cuentas viejas es una noticia importante, no un ataque", () => {
    const r = detectarRafaga(
      interacciones(80, { enMinutos: 20, diasDeLaCuenta: DIAS_PARA_MADURAR + 100 }),
      AHORA,
    );
    assert.equal(r.sospechosa, false);
    assert.match(r.motivo, /noticia importante/);
  });

  // Y muchas cuentas nuevas repartidas en el tiempo tampoco: puede ser una
  // campana de registro legitima.
  test("muchas cuentas nuevas repartidas en dias no es una rafaga", () => {
    const r = detectarRafaga(
      interacciones(100, { enMinutos: 60 * 24 * 7, diasDeLaCuenta: 0 }),
      AHORA,
    );
    assert.equal(r.sospechosa, false);
  });

  test("lo sospechoso es que coincidan volumen concentrado y cuentas nuevas", () => {
    const r = detectarRafaga(
      interacciones(50, { enMinutos: 20, diasDeLaCuenta: 0 }),
      AHORA,
    );
    assert.equal(r.sospechosa, true);
    assert.match(r.motivo, /cuentas creadas hace menos/);
  });

  test("una mezcla mayoritariamente legitima no se marca", () => {
    const r = detectarRafaga(
      [
        ...interacciones(40, { enMinutos: 20, diasDeLaCuenta: 200 }),
        ...interacciones(10, { enMinutos: 20, diasDeLaCuenta: 0 }),
      ],
      AHORA,
    );
    assert.equal(r.sospechosa, false);
  });

  // Un ataque que arranca a las 10:59 quedaria partido en dos horas de reloj y
  // ninguna se veria anomala. La ventana movil no tiene ese punto ciego.
  test("la ventana movil no se deja partir por el reloj", () => {
    const aCaballoDeDosHoras: InteraccionDeRanking[] = Array.from({ length: 40 }, (_, i) => ({
      tipo: "reaccion" as const,
      // Repartidas entre 10:50 y 11:10, a caballo del cambio de hora.
      creadaEn: new Date(new Date("2026-09-30T10:50:00.000Z").getTime() + i * 30_000),
      cuentaCreadaEn: AHORA,
      autoridad: null,
    }));

    const r = detectarRafaga(aCaballoDeDosHoras, AHORA);
    assert.equal(r.sospechosa, true);
  });

  test("los umbrales se pueden ajustar", () => {
    const pocas = interacciones(10, { enMinutos: 5, diasDeLaCuenta: 0 });
    assert.equal(detectarRafaga(pocas, AHORA).sospechosa, false);
    assert.equal(
      detectarRafaga(pocas, AHORA, { minimoDeInteracciones: 8 }).sospechosa,
      true,
    );
  });
});
