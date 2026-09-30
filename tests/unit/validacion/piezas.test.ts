// ===========================================================================
// Las piezas puras: dominios, texto y metadatos
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  candidatosDeDominio,
  candidatosDeUrl,
  dominioBase,
  extraerDominio,
  leerMetadatos,
  normalizar,
  palabrasClave,
  respaldoEnElCuerpo,
  similitudDeTitulos,
} from "../../../src/modules/validacion/index.ts";

describe("dominios", () => {
  test("saca el host y le quita el www", () => {
    assert.equal(extraerDominio("https://www.prensalibre.com/guatemala/nota"), "prensalibre.com");
    assert.equal(extraerDominio("http://PrensaLibre.com/x"), "prensalibre.com");
  });

  test("rechaza lo que no identifica a un medio", () => {
    assert.equal(extraerDominio("no es una url"), null);
    assert.equal(extraerDominio("https://192.168.1.10/nota"), null);
    assert.equal(extraerDominio("https://localhost/nota"), null);
  });

  test("va del subdominio al dominio base", () => {
    assert.deepEqual(candidatosDeDominio("noticias.prensalibre.com"), [
      "noticias.prensalibre.com",
      "prensalibre.com",
    ]);
  });

  // Este es el que importa: sin la lista de sufijos compuestos, `dca.com.gt`
  // generaria el candidato `com.gt`, y un sufijo no es una fuente.
  test("nunca produce un sufijo suelto", () => {
    assert.deepEqual(candidatosDeDominio("dca.com.gt"), ["dca.com.gt"]);
    assert.deepEqual(candidatosDeDominio("x.dca.com.gt"), ["x.dca.com.gt", "dca.com.gt"]);
    assert.deepEqual(candidatosDeDominio("lahora.gt"), ["lahora.gt"]);
    assert.deepEqual(candidatosDeDominio("gt"), []);

    for (const dominio of ["dca.com.gt", "x.dca.com.gt", "algo.co.uk"]) {
      for (const candidato of candidatosDeDominio(dominio)) {
        assert.ok(
          !["com.gt", "co.uk", "gt", "uk", "com"].includes(candidato),
          `${candidato} es un sufijo, no una fuente`,
        );
      }
    }
  });

  test("el dominio base sirve para comparar independencia", () => {
    assert.equal(dominioBase("https://noticias.prensalibre.com/a"), "prensalibre.com");
    assert.equal(dominioBase("https://www.prensalibre.com/b"), "prensalibre.com");
    assert.deepEqual(candidatosDeUrl("no-es-url"), []);
  });
});

describe("texto", () => {
  test("normaliza acentos, mayusculas y puntuacion", () => {
    assert.equal(normalizar("¡Petén, Guatemala!"), "peten guatemala");
  });

  test("dos titulares iguales dan 1 y dos ajenos dan poco", () => {
    assert.equal(similitudDeTitulos("Sismo sacude la costa sur", "Sismo sacude la costa sur"), 1);
    assert.ok(similitudDeTitulos("Sismo sacude la costa sur", "Suben los precios del cafe") < 0.2);
  });

  test("tolera reordenar y acentuar distinto", () => {
    const s = similitudDeTitulos(
      "Sismo de magnitud 5.4 sacude la costa sur de Guatemala",
      "Guatemala: sismo de magnitud 5.4 en la costa sur",
    );
    assert.ok(s > 0.7, `esperaba parecido alto, dio ${s}`);
  });

  test("distingue un titular tergiversado", () => {
    // Mismas palabras de relleno, pero el hecho es otro.
    const s = similitudDeTitulos(
      "El ministro renuncia tras el escandalo",
      "El ministro desmiente el escandalo y se queda",
    );
    assert.ok(s < 0.7, `esperaba parecido moderado o bajo, dio ${s}`);
  });

  test("las palabras clave prefieren nombres propios", () => {
    const claves = palabrasClave("El Congreso de Guatemala aprueba el presupuesto de Petén");
    assert.ok(claves.includes("guatemala"));
    assert.ok(claves.includes("peten"));
    assert.ok(!claves.includes("el"), "las vacias no deben entrar");
    assert.ok(claves.length <= 6);
  });

  test("respaldo en el cuerpo", () => {
    assert.equal(respaldoEnElCuerpo("Sismo en la costa", "Hubo un sismo fuerte en la costa sur"), 1);
    assert.ok(respaldoEnElCuerpo("Sismo en la costa", "Se habla de economia y cafe") < 0.3);
  });
});

describe("metadatos", () => {
  test("lee Open Graph con cualquier orden de atributos y comillas", () => {
    const m = leerMetadatos(`
      <meta content='Titular real' property="og:title">
      <meta name=description content="Resumen">
      <meta property="article:published_time" content="2026-09-29T10:00:00Z">
    `);
    assert.equal(m.titulo, "Titular real");
    assert.equal(m.descripcion, "Resumen");
    assert.equal(m.publicadoEn?.toISOString(), "2026-09-29T10:00:00.000Z");
  });

  test("cae al <title> cuando no hay Open Graph", () => {
    assert.equal(leerMetadatos("<title>Solo el title</title>").titulo, "Solo el title");
  });

  test("decodifica entidades", () => {
    const m = leerMetadatos(`<meta property="og:title" content="Caf&eacute; &amp; az&#250;car">`);
    assert.equal(m.titulo, "Caf&eacute; & azúcar");
  });

  test("devuelve null cuando no hay nada legible", () => {
    const m = leerMetadatos("<html><body>sin cabecera</body></html>");
    assert.equal(m.titulo, null);
    assert.equal(m.publicadoEn, null);
  });

  test("una fecha invalida no revienta", () => {
    const m = leerMetadatos(`<meta property="article:published_time" content="ayer">`);
    assert.equal(m.publicadoEn, null);
  });
});
