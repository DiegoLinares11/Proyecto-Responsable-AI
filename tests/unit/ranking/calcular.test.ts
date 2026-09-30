// ===========================================================================
// Fase 3 — La fórmula del ranking
//
// Criterio de aceptación (docs/plan-por-fases.md):
//
//   «Con datos sembrados, el orden es reproducible y cada posición se puede
//    justificar con números. Un intento simulado de inflar una noticia con 50
//    cuentas nuevas no la sube al primer lugar.»
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  calcularRelevancia,
  explicarRelevancia,
  factorPorAntiguedadDeCuenta,
  ordenarPorRelevancia,
  pesosIniciales,
  DIAS_PARA_MADURAR,
  type EstadoNoticia,
  type InsumosDeRanking,
  type InteraccionDeRanking,
} from "../../../src/modules/ranking/index.ts";

const AHORA = new Date("2026-09-30T12:00:00.000Z");
const PESOS = pesosIniciales();

const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000);
const haceHoras = (horas: number) => new Date(AHORA.getTime() - horas * 3_600_000);

const MADURA = haceDias(DIAS_PARA_MADURAR + 30);
const RECIEN_CREADA = haceDias(0);

type Receta = {
  id: string;
  estado?: EstadoNoticia;
  horas?: number;
  credibilidad?: number | null;
  veracidad?: number | null;
  reacciones?: number;
  comentarios?: number;
  lecturas?: number;
  verificadas?: ReadonlyArray<{ autoridad: number; tipo?: "reaccion" | "comentario" | "lectura" }>;
  /** Reacciones desde cuentas creadas hoy, todas en la misma ventana. */
  cuentasNuevas?: number;
};

function insumos(receta: Receta): InsumosDeRanking {
  const horas = receta.horas ?? 6;
  const interacciones: InteraccionDeRanking[] = [];

  const agregar = (
    cuantas: number,
    tipo: InteraccionDeRanking["tipo"],
    cuentaCreadaEn: Date,
    autoridad: number | null = null,
    minutoBase = 0,
  ) => {
    for (let i = 0; i < cuantas; i++) {
      interacciones.push({
        tipo,
        creadaEn: new Date(AHORA.getTime() - (minutoBase + i) * 60_000),
        cuentaCreadaEn,
        autoridad,
      });
    }
  };

  agregar(receta.reacciones ?? 0, "reaccion", MADURA, null, 120);
  agregar(receta.comentarios ?? 0, "comentario", MADURA, null, 300);
  agregar(receta.lecturas ?? 0, "lectura", MADURA, null, 400);

  for (const v of receta.verificadas ?? []) {
    agregar(1, v.tipo ?? "reaccion", MADURA, v.autoridad, 60);
  }

  // Las cuentas nuevas atacan todas juntas, en una sola ventana de minutos.
  agregar(receta.cuentasNuevas ?? 0, "reaccion", RECIEN_CREADA, null, 0);

  return {
    idNoticia: receta.id,
    estado: receta.estado ?? "verificada",
    publicadaEn: haceHoras(horas),
    credibilidadFuente: receta.credibilidad === undefined ? 75 : receta.credibilidad,
    puntajeVeracidad: receta.veracidad === undefined ? 80 : receta.veracidad,
    interacciones,
  };
}

const calcular = (receta: Receta) =>
  calcularRelevancia(insumos(receta), PESOS, { ahora: AHORA });

// ---------------------------------------------------------------------------

describe("peso por antiguedad de cuenta", () => {
  test("una cuenta creada hoy no aporta nada", () => {
    assert.equal(factorPorAntiguedadDeCuenta(AHORA, AHORA), 0);
  });

  test("crece hasta madurar y ahi se queda", () => {
    assert.equal(factorPorAntiguedadDeCuenta(haceDias(DIAS_PARA_MADURAR / 2), AHORA), 0.5);
    assert.equal(factorPorAntiguedadDeCuenta(haceDias(DIAS_PARA_MADURAR), AHORA), 1);
    assert.equal(factorPorAntiguedadDeCuenta(haceDias(500), AHORA), 1);
  });

  test("una fecha futura no da peso negativo", () => {
    assert.equal(factorPorAntiguedadDeCuenta(new Date(AHORA.getTime() + 86_400_000), AHORA), 0);
  });
});

describe("la formula", () => {
  test("cada componente entra por separado y suma el puntaje base", () => {
    const d = calcular({ id: "a", credibilidad: 90, veracidad: 95, reacciones: 40, comentarios: 10 });

    assert.equal(d.componenteFuente, 18); // 20 × 0.90, lineal
    // La veracidad entra al cuadrado: 25 × 0.95² = 22.5625. En lineal serian
    // 23.75, y la diferencia entre raspar el umbral y estar solido se perdia.
    assert.equal(d.componenteVeracidad, 22.5625);
    assert.ok(d.componenteInteracciones > 0);

    const suma =
      d.componenteInteracciones +
      d.componenteVerificadas +
      d.componenteFuente +
      d.componenteVeracidad -
      d.penalizacionEstado;
    assert.ok(Math.abs(suma - d.puntajeBase) < 0.001);
    // Tolerancia relativa: los dos son valores redondeados, asi que el error
    // admisible tiene que escalar con la magnitud y no ser un absoluto.
    assert.ok(
      Math.abs(d.puntajeBase * d.factorAntiguedad - d.relevancia) < d.relevancia * 0.001,
      "la relevancia debe ser el puntaje base por el factor de antiguedad",
    );
  });

  // Sin el logaritmo, mil reacciones aplastan a cien aunque no sean diez veces
  // mas relevantes.
  test("el rendimiento de las interacciones es decreciente", () => {
    const cien = calcular({ id: "a", reacciones: 100 }).componenteInteracciones;
    const mil = calcular({ id: "b", reacciones: 1000 }).componenteInteracciones;

    assert.ok(mil > cien, "mas interacciones deben aportar mas");
    assert.ok(mil < cien * 2, "pero diez veces mas no debe aportar diez veces mas");
  });

  test("lo viejo decae", () => {
    const receta = { reacciones: 50, comentarios: 10 } as const;
    const fresca = calcular({ id: "a", horas: 1, ...receta });
    const de_ayer = calcular({ id: "b", horas: 24, ...receta });
    const de_la_semana = calcular({ id: "c", horas: 168, ...receta });

    assert.ok(fresca.relevancia > de_ayer.relevancia);
    assert.ok(de_ayer.relevancia > de_la_semana.relevancia);
    assert.ok(Math.abs(fresca.puntajeBase - de_la_semana.puntajeBase) < 0.001,
      "el puntaje base es el mismo; lo que cambia es el divisor");
  });

  test("una cuenta verificada respalda mas que una anonima", () => {
    const anonimas = calcular({ id: "a", reacciones: 3 });
    const verificadas = calcular({
      id: "b",
      reacciones: 0,
      verificadas: [{ autoridad: 90 }, { autoridad: 85 }, { autoridad: 80 }],
    });

    assert.ok(
      verificadas.componenteVerificadas > 0 && anonimas.componenteVerificadas === 0,
      "solo las verificadas alimentan ese termino",
    );
    assert.ok(verificadas.relevancia > anonimas.relevancia);
  });

  test("que una cuenta verificada solo LEA no es respaldo", () => {
    const leyendo = calcular({ id: "a", verificadas: [{ autoridad: 100, tipo: "lectura" }] });
    assert.equal(leyendo.componenteVerificadas, 0);
  });

  test("una fuente fuera del registro no aporta credibilidad, y no revienta", () => {
    const d = calcular({ id: "a", credibilidad: null, veracidad: null });
    assert.equal(d.componenteFuente, 0);
    assert.equal(d.componenteVeracidad, 0);
    assert.ok(Number.isFinite(d.relevancia));
  });

  test("el mismo insumo da siempre el mismo resultado", () => {
    const receta: Receta = { id: "a", reacciones: 33, comentarios: 7, verificadas: [{ autoridad: 70 }] };
    assert.deepEqual(calcular(receta), calcular(receta));
  });
});

describe("estados", () => {
  test("solo lo verificado entra al feed", () => {
    for (const estado of ["borrador", "en_revision", "no_verificable", "desmentida", "archivada"] as const) {
      const d = calcular({ id: "a", estado, reacciones: 5000 });
      assert.equal(d.visible, false, `${estado} no deberia ser visible`);
      assert.equal(d.relevancia, 0);
      // El autor tiene derecho a ver por que.
      assert.ok(d.renglones.length > 0);
    }
  });

  // El esquema de la Fase 1 solo permite `publicada_en` a las verificadas, asi
  // que una noticia en revision no tiene antiguedad que medir y no envejeceria
  // nunca en el feed. La base tenia razon: mostrar en el feed algo que el canal
  // de validacion no dio por bueno ES publicarlo, penalizado o no.
  test("en revision no entra al feed; va a la cola de moderacion", () => {
    const enRevision = calcular({ id: "a", estado: "en_revision", reacciones: 5000 });
    assert.equal(enRevision.visible, false);
    assert.equal(enRevision.relevancia, 0);
  });

  // Hoy ninguna penalizacion produce un puntaje base negativo, porque el unico
  // estado visible no penaliza. La guarda queda cubierta igual, porque si
  // manana se agrega un estado penalizado, dividir un negativo por el
  // decaimiento lo acercaria a cero DESDE ABAJO y la noticia se veria mejor con
  // el paso de las horas.
  test("un puntaje base de cero no crece con el tiempo", () => {
    const receta = { credibilidad: 0, veracidad: 0, reacciones: 0 } as const;
    const nueva = calcular({ id: "a", horas: 1, ...receta });
    const vieja = calcular({ id: "b", horas: 500, ...receta });

    assert.equal(nueva.puntajeBase, 0);
    assert.equal(nueva.relevancia, 0);
    assert.equal(vieja.relevancia, 0);
  });
});

// ===========================================================================
// El criterio de aceptación
// ===========================================================================

describe("el orden del feed", () => {
  // La asercion que docs/ranking-relevancia.md pide como prueba de regresion de
  // los pesos: si un cambio de pesos la rompe, el cambio esta mal.
  test("una verificada de fuente fuerte gana a una viral sin corroborar", () => {
    const bienSustentada = calcular({
      id: "bien-sustentada",
      estado: "verificada",
      credibilidad: 90,
      veracidad: 95,
      reacciones: 40,
      comentarios: 10,
      verificadas: [{ autoridad: 85 }, { autoridad: 80 }],
    });

    // «Sin corroborar» aqui es una noticia que paso el umbral por los pelos: la
    // URL existe y es coherente, pero ningun otro medio cubre el hecho y la
    // fuente no esta en el registro.
    const viralSinCorroborar = calcular({
      id: "viral",
      estado: "verificada",
      credibilidad: null,
      veracidad: 50,
      reacciones: 500,
      comentarios: 100,
      horas: 3,
    });

    assert.ok(
      bienSustentada.relevancia > viralSinCorroborar.relevancia,
      `la bien sustentada (${bienSustentada.relevancia}) debe ganarle a la viral (${viralSinCorroborar.relevancia})`,
    );
  });

  test("el orden es reproducible y cada posicion se justifica con numeros", () => {
    const recetas: Receta[] = [
      { id: "c-vieja-buena", credibilidad: 90, veracidad: 95, reacciones: 200, horas: 200 },
      { id: "a-fresca-buena", credibilidad: 90, veracidad: 95, reacciones: 40, horas: 2 },
      { id: "d-borrador", estado: "borrador", reacciones: 900 },
      { id: "b-fresca-floja", credibilidad: 30, veracidad: 50, reacciones: 40, horas: 2 },
    ];

    const orden = ordenarPorRelevancia(recetas.map(calcular)).map((d) => d.idNoticia);

    assert.deepEqual(orden, ["a-fresca-buena", "b-fresca-floja", "c-vieja-buena"]);
    assert.ok(!orden.includes("d-borrador"), "un borrador no aparece en el feed");

    // Reproducible: dos corridas con los mismos insumos dan el mismo orden.
    assert.deepEqual(ordenarPorRelevancia(recetas.map(calcular)).map((d) => d.idNoticia), orden);

    // Y cada posicion trae sus numeros.
    for (const d of ordenarPorRelevancia(recetas.map(calcular))) {
      const texto = explicarRelevancia(d);
      assert.match(texto, /Relevancia/);
      assert.match(texto, /Credibilidad de la fuente/);
      assert.match(texto, /Antig/);
      assert.ok(d.renglones.length >= 5);
    }
  });
});

describe("cincuenta cuentas nuevas no compran el primer lugar", () => {
  const VICTIMA: Receta = {
    id: "inflada",
    credibilidad: 20,
    veracidad: 50,
    horas: 6,
  };

  const RIVAL = calcular({
    id: "legitima",
    credibilidad: 90,
    veracidad: 95,
    reacciones: 40,
    comentarios: 10,
    verificadas: [{ autoridad: 85 }, { autoridad: 80 }],
    horas: 6,
  });

  test("el ataque casi no mueve la aguja", () => {
    const sinAtaque = calcular(VICTIMA);
    const conAtaque = calcular({ ...VICTIMA, cuentasNuevas: 50 });

    const diferencia = Math.abs(conAtaque.relevancia - sinAtaque.relevancia);
    assert.ok(
      diferencia < sinAtaque.relevancia * 0.02,
      `50 cuentas nuevas movieron la relevancia de ${sinAtaque.relevancia} a ${conAtaque.relevancia}`,
    );
  });

  test("y no la sube al primer lugar", () => {
    const conAtaque = calcular({ ...VICTIMA, cuentasNuevas: 50 });
    const orden = ordenarPorRelevancia([conAtaque, RIVAL]).map((d) => d.idNoticia);
    assert.deepEqual(orden, ["legitima", "inflada"]);
  });

  test("queda marcada como rafaga, pero no se borra nada", () => {
    const conAtaque = calcular({ ...VICTIMA, cuentasNuevas: 50 });

    assert.equal(conAtaque.rafaga.sospechosa, true);
    // El conteo es de la ventana de 30 minutos, no del total historico: lo que
    // delata al ataque es la concentracion, y una ventana movil es lo que la ve.
    assert.ok(conAtaque.rafaga.interaccionesEnLaVentana >= 20);
    assert.equal(
      conAtaque.rafaga.cuentasNuevasImplicadas,
      conAtaque.rafaga.interaccionesEnLaVentana,
      "en este ataque toda la ventana viene de cuentas nuevas",
    );
    assert.match(conAtaque.rafaga.motivo, /revise una persona/);
    assert.match(explicarRelevancia(conAtaque), /⚠/);
  });

  // Lo que frena el ataque es la antiguedad de las cuentas, no un tope al
  // numero de interacciones: con cuentas viejas las mismas 50 reacciones si
  // aportan. El tiempo es lo que el atacante no puede comprar.
  test("con cuentas maduras las mismas 50 reacciones si aportan", () => {
    const conNuevas = calcular({ ...VICTIMA, cuentasNuevas: 50 });
    const conMaduras = calcular({ ...VICTIMA, reacciones: 50 });

    // La afirmacion precisa: las cuentas nuevas no alimentan el termino de
    // interacciones y las maduras si. El efecto sobre la relevancia final es
    // menor de lo que parece —son 5 de 21 puntos del puntaje base— porque el
    // logaritmo aplasta la traccion a proposito.
    assert.equal(conNuevas.componenteInteracciones, 0);
    assert.ok(conMaduras.componenteInteracciones > 4);
    assert.ok(conMaduras.relevancia > conNuevas.relevancia);
    assert.equal(conMaduras.rafaga.sospechosa, false);
  });

  // Pero ni con cuentas maduras alcanza, porque fuente y veracidad valen 45 de
  // los puntos del puntaje base y no se compran con tráfico.
  test("ni con cuentas maduras le gana a una bien sustentada", () => {
    const conMaduras = calcular({ ...VICTIMA, reacciones: 50, comentarios: 20 });
    assert.ok(conMaduras.relevancia < RIVAL.relevancia);
  });
});

// ===========================================================================
// Regresión de la calibración, con los perfiles reales de los datos sembrados
//
// Estos números salieron de correr `scripts/mostrar_feed.mjs` contra el proyecto
// de Supabase con `scripts/sembrar_demo.sql` aplicado. Con los pesos iniciales
// —gravedad 1.5 y veracidad lineal— el orden salía AL REVÉS: la noticia de
// fuente desconocida y veracidad 76 con tres horas de vida le ganaba a la de
// fuente registrada y veracidad 92 con seis horas.
//
// Esta prueba es la que hace que esa calibración no se pierda. Si alguien sube
// la gravedad o vuelve la veracidad a lineal, falla aquí.
// ===========================================================================

describe("regresion de la calibracion", () => {
  const BIEN_SUSTENTADA: Receta = {
    id: "A-bien-sustentada",
    credibilidad: 75, // Prensa Libre, en el registro
    veracidad: 92,
    horas: 6,
    reacciones: 18,
    comentarios: 6,
    verificadas: [{ autoridad: 88 }],
  };

  const VIRAL_QUE_RASPO: Receta = {
    id: "B-viral-que-raspo",
    credibilidad: null, // fuera del registro
    veracidad: 76, // apenas encima del umbral de 75
    horas: 3, // la mitad de antigua
    reacciones: 20,
    comentarios: 15,
    lecturas: 20,
  };

  test("estar bien sustentado le gana a ser fresco y viral", () => {
    const a = calcular(BIEN_SUSTENTADA);
    const b = calcular(VIRAL_QUE_RASPO);

    assert.ok(
      a.relevancia > b.relevancia,
      `A=${a.relevancia} deberia ganarle a B=${b.relevancia}`,
    );

    // Con margen suficiente para que la asercion no sea fragil. Con gravedad
    // 1.2 y veracidad al cuadrado el margen medido es del 21%.
    const margen = (a.relevancia - b.relevancia) / b.relevancia;
    assert.ok(margen > 0.1, `el margen es de solo ${(margen * 100).toFixed(1)}%`);
  });

  test("y sigue ganando el orden completo del feed sembrado", () => {
    const vieja_pero_buena: Receta = {
      id: "C-vieja-pero-buena",
      credibilidad: 75,
      veracidad: 90,
      horas: 72,
      reacciones: 18,
    };
    const inflada: Receta = {
      id: "D-inflada",
      credibilidad: null,
      veracidad: 52,
      horas: 6,
      cuentasNuevas: 50,
    };

    const orden = ordenarPorRelevancia(
      [BIEN_SUSTENTADA, VIRAL_QUE_RASPO, vieja_pero_buena, inflada].map(calcular),
    ).map((d) => d.idNoticia);

    assert.deepEqual(orden, [
      "A-bien-sustentada",
      "B-viral-que-raspo",
      "D-inflada",
      "C-vieja-pero-buena",
    ]);
  });

  // La veracidad al cuadrado tiene que distinguir raspar de estar solido.
  test("raspar el umbral vale bastante menos que estar solido", () => {
    const raspando = calcular({ id: "a", veracidad: 76, credibilidad: 0, reacciones: 0 });
    const solida = calcular({ id: "b", veracidad: 95, credibilidad: 0, reacciones: 0 });

    const razon = solida.componenteVeracidad / raspando.componenteVeracidad;
    assert.ok(razon > 1.5, `95 deberia valer bastante mas que 76, y vale ${razon.toFixed(2)}x`);
  });
});
