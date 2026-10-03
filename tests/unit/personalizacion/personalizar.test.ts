// ===========================================================================
// La personalización del feed (R-03, R-05, R-06, R-07 de docs/requisitos.md)
//
// El módulo vive en la app (app-movil/src/lib/personalizacion.ts), que es donde
// se usa, y se prueba acá porque no importa nada: corre en Node sin Metro.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  CUPOS,
  FACTORES_GEOGRAFICOS,
  factorDeInteres,
  factorGeografico,
  personalizar,
  type Lectura,
  type NoticiaPersonalizable,
  type Ubicacion,
} from "../../../app-movil/src/lib/personalizacion.ts";

const QUETZALTENANGO: Ubicacion = { id: "GT-QZ", nombre: "Quetzaltenango", pais: "GT" };
const PETEN: Ubicacion = { id: "GT-PE", nombre: "Petén", pais: "GT" };
const MEXICO: Ubicacion = { id: "MX", nombre: "México", pais: "MX" };

const nota = (
  id: string,
  relevancia: number,
  alcance: NoticiaPersonalizable["alcance"],
  donde: { pais?: string | null; zona?: string | null } = {},
  seccion = "general",
): NoticiaPersonalizable => ({
  id,
  relevancia,
  alcance,
  seccion,
  pais: donde.pais === undefined ? (alcance === "internacional" ? null : "GT") : donde.pais,
  idUbicacion: donde.zona ?? null,
});

// Un feed parecido al real: mucha relevancia global en lo internacional y lo
// deportivo, y lo local abajo.
const FEED: NoticiaPersonalizable[] = [
  nota("mundo-1", 9.0, "internacional", {}, "mundo"),
  nota("deporte-1", 7.0, "nacional", {}, "deportes"),
  nota("deporte-2", 6.5, "nacional", {}, "deportes"),
  nota("economia-1", 6.0, "internacional", {}, "economia"),
  nota("deporte-3", 5.5, "nacional", {}, "deportes"),
  nota("deporte-4", 5.0, "nacional", {}, "deportes"),
  nota("politica-1", 4.0, "nacional", {}, "politica"),
  nota("local-qz", 1.0, "local", { zona: "GT-QZ" }, "guatemala"),
  nota("local-pe", 1.0, "local", { zona: "GT-PE" }, "guatemala"),
  nota("mundo-2", 0.8, "internacional", {}, "mundo"),
];

const ids = (lista: ReturnType<typeof personalizar>) => lista.map((n) => n.noticia.id);

describe("el factor geográfico", () => {
  test("cada motivo tiene su factor publicado", () => {
    assert.equal(factorGeografico(nota("a", 1, "local", { zona: "GT-QZ" }), QUETZALTENANGO).valor, 1.6);
    assert.equal(factorGeografico(nota("a", 1, "local", { zona: "GT-PE" }), QUETZALTENANGO).valor, 0.2);
    assert.equal(factorGeografico(nota("a", 1, "nacional"), QUETZALTENANGO).valor, 1.2);
    assert.equal(factorGeografico(nota("a", 1, "internacional"), QUETZALTENANGO).valor, 1.0);
    assert.equal(factorGeografico(nota("a", 1, "nacional", { pais: "MX" }), QUETZALTENANGO).motivo, "otro_pais");
  });

  test("lo nacional de Guatemala, para alguien en México, es de otro país", () => {
    const f = factorGeografico(nota("a", 1, "nacional"), MEXICO);
    assert.equal(f.motivo, "otro_pais");
    assert.equal(f.valor, FACTORES_GEOGRAFICOS.otro_pais);
  });
});

describe("el factor de interés", () => {
  // Nadie es castigado por ser nuevo.
  test("sin lecturas, todas las secciones valen 1", () => {
    for (const seccion of ["deportes", "cultura", "mundo"]) {
      assert.equal(factorDeInteres(seccion, []).valor, 1);
    }
  });

  test("una sola lectura mueve poco", () => {
    const f = factorDeInteres("deportes", [{ seccion: "deportes" }]);
    assert.ok(f.valor > 1 && f.valor < 1.15, String(f.valor));
  });

  test("está acotado: un lector extremo no pasa de 1.4 ni baja de 0.8", () => {
    const soloDeportes: Lectura[] = Array.from({ length: 40 }, () => ({ seccion: "deportes" }));
    assert.equal(factorDeInteres("deportes", soloDeportes).valor, 1.4);
    assert.equal(factorDeInteres("cultura", soloDeportes).valor, 0.8);
  });

  test("informa cuántas lecturas lo sostienen", () => {
    const f = factorDeInteres("deportes", [{ seccion: "deportes" }, { seccion: "deportes" }, { seccion: "mundo" }]);
    assert.equal(f.lecturas, 2);
    assert.equal(f.total, 3);
  });
});

describe("la personalización", () => {
  test("dos ubicaciones ven las mismas noticias en distinto orden", () => {
    const qz = ids(personalizar(FEED, QUETZALTENANGO, []));
    const pe = ids(personalizar(FEED, PETEN, []));

    assert.notDeepEqual(qz, pe);
    assert.ok(qz.indexOf("local-qz") < qz.indexOf("local-pe"), "en Quetzaltenango, lo de Quetzaltenango va antes");
    assert.ok(pe.indexOf("local-pe") < pe.indexOf("local-qz"), "en Petén, lo de Petén va antes");
  });

  // El interés reordena; ningún factor saca una noticia del feed.
  test("nada desaparece: entran todas las noticias, una sola vez", () => {
    const soloDeportes: Lectura[] = Array.from({ length: 40 }, () => ({ seccion: "deportes" }));
    const resultado = ids(personalizar(FEED, MEXICO, soloDeportes));
    assert.equal(resultado.length, FEED.length);
    assert.equal(new Set(resultado).size, FEED.length);
  });

  test("es determinista", () => {
    const lecturas: Lectura[] = [{ seccion: "deportes" }, { seccion: "mundo" }];
    assert.deepEqual(
      ids(personalizar(FEED, QUETZALTENANGO, lecturas)),
      ids(personalizar(FEED, QUETZALTENANGO, lecturas)),
    );
  });
});

// Los números de estas pruebas son los del 3 de octubre en la base real. Con
// el primer ×0.6, a alguien en la capital las cuatro primeras le salían
// locales de OTROS departamentos: tenían 3 a 6 horas contra 14 a 22 de lo
// internacional, y la frescura multiplicaba su relevancia global casi ×4.
describe("calibración con los datos del 3 de octubre", () => {
  const CAPITAL: Ubicacion = { id: "GT-GU", nombre: "Guatemala", pais: "GT" };
  const REAL: NoticiaPersonalizable[] = [
    nota("qz-salud", 4.59, "local", { zona: "GT-QZ" }, "guatemala"),
    nota("es-ruta", 3.59, "local", { zona: "GT-ES" }, "guatemala"),
    nota("pe-incendios", 3.24, "local", { zona: "GT-PE" }, "guatemala"),
    nota("av-albergues", 2.83, "local", { zona: "GT-AV" }, "guatemala"),
    nota("emisiones", 1.17, "internacional", {}, "mundo"),
    nota("piketty", 1.15, "internacional", {}, "economia"),
    nota("banco", 0.98, "internacional", {}, "economia"),
    nota("seleccion", 0.97, "nacional", {}, "deportes"),
    nota("docentes", 0.77, "nacional", {}, "guatemala"),
    nota("gu-festival", 0.43, "local", { zona: "GT-GU" }, "cultura"),
    nota("gu-movilidad", 0.34, "local", { zona: "GT-GU" }, "guatemala"),
  ];

  test("en la capital, lo local de otros departamentos no tapa lo nacional ni lo internacional", () => {
    const tres = personalizar(REAL, CAPITAL, []).slice(0, 3);
    assert.ok(
      tres.every((n) => n.geografico.motivo !== "otra_zona"),
      tres.map((n) => n.noticia.id).join(", "),
    );
  });

  test("en Quetzaltenango, lo de Quetzaltenango va primero", () => {
    assert.equal(personalizar(REAL, QUETZALTENANGO, [])[0]?.noticia.id, "qz-salud");
  });

  // Una noticia local es importante para su zona, no «para todos». Lo más
  // importante del día es lo nacional o internacional de mayor relevancia —
  // aquí, la hoja de ruta de emisiones—, y tiene que estar arriba en todas
  // partes. (Una primera versión de esta prueba pasaba en vacío: si la local
  // ya quedaba primera por puntaje, nunca se marcaba como garantizada.)
  test("lo más importante del día es lo nacional o internacional, y está arriba en todas partes", () => {
    for (const ubicacion of [CAPITAL, MEXICO, PETEN, QUETZALTENANGO]) {
      const lista = personalizar(REAL, ubicacion, []);
      const tres = lista.slice(0, CUPOS.loMasImportante).map((n) => n.noticia.id);
      assert.ok(tres.includes("emisiones"), `${ubicacion.nombre}: ${tres.join(", ")}`);
      assert.ok(
        lista.every((n) => !(n.garantizada === "lo_mas_importante" && n.noticia.alcance === "local")),
        ubicacion.nombre,
      );
    }
  });

  test("lo de la capital entra arriba por cupo, aunque tenga dos días", () => {
    const seis = personalizar(REAL, CAPITAL, []).slice(0, CUPOS.primeras);
    assert.ok(seis.some((n) => n.geografico.motivo === "tu_zona"));
  });
});

describe("los cupos de cobertura (R-07)", () => {
  const soloDeportes: Lectura[] = Array.from({ length: 40 }, () => ({ seccion: "deportes" }));

  // El criterio de aceptación tal como está escrito en docs/requisitos.md.
  test("quien solo lee deportes igual ve lo local, lo nacional y lo internacional arriba", () => {
    const primeras = personalizar(FEED, QUETZALTENANGO, soloDeportes).slice(0, CUPOS.primeras);

    assert.ok(primeras.some((n) => n.geografico.motivo === "tu_zona"), "falta lo local");
    assert.ok(primeras.some((n) => n.geografico.motivo === "tu_pais"), "falta lo nacional");
    assert.ok(primeras.some((n) => n.geografico.motivo === "internacional"), "falta lo internacional");
  });

  test("lo local que entra por cupo queda marcado como garantizado", () => {
    const lista = personalizar(FEED, QUETZALTENANGO, soloDeportes);
    const local = lista.find((n) => n.noticia.id === "local-qz");
    assert.equal(local?.garantizada, "local");
  });

  test("lo más importante del día está entre las tres primeras para todos", () => {
    // Alguien en México que solo lee deportes es el peor caso para «mundo-1».
    for (const [ubicacion, lecturas] of [
      [QUETZALTENANGO, []],
      [MEXICO, soloDeportes],
      [PETEN, soloDeportes],
    ] as const) {
      const lista = ids(personalizar(FEED, ubicacion, lecturas));
      assert.ok(lista.indexOf("mundo-1") < CUPOS.loMasImportante, `${ubicacion.nombre}: ${lista.join(", ")}`);
    }
  });

  test("si un cupo ya se cumple por puntaje, no se toca", () => {
    const lista = personalizar(FEED, QUETZALTENANGO, []);
    const internacionales = lista.slice(0, CUPOS.primeras).filter((n) => n.geografico.motivo === "internacional");
    assert.ok(internacionales.length > 0);
    assert.ok(internacionales.every((n) => n.garantizada !== "internacional"));
  });

  // Si no existe nada local para esa ubicación, no se inventa: el cupo queda vacío.
  test("un cupo sin candidatas no se rellena con otra cosa", () => {
    const sinLocales = FEED.filter((n) => n.alcance !== "local");
    const lista = personalizar(sinLocales, QUETZALTENANGO, soloDeportes);
    assert.ok(lista.every((n) => n.garantizada !== "local"));
    assert.equal(lista.length, sinLocales.length);
  });

  test("con un feed corto no se rompe", () => {
    assert.deepEqual(personalizar([], QUETZALTENANGO, []), []);
    assert.equal(personalizar(FEED.slice(0, 2), QUETZALTENANGO, soloDeportes).length, 2);
  });
});
