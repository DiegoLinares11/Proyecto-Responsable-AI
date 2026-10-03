// ===========================================================================
// La imagen que el medio declara para que lo enlacen
//
// Solo https: una imagen por http en una página https la bloquea el navegador,
// y la columna `url_imagen` la rechaza igual. Mejor no proponerla.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { leerMetadatos } from "../../../src/modules/validacion/index.ts";

const pagina = (metas: string) => `<html><head><title>Titular</title>${metas}</head><body></body></html>`;

describe("la imagen de los metadatos", () => {
  test("toma og:image", () => {
    const m = leerMetadatos(pagina(`<meta property="og:image" content="https://cdn.medio.gt/foto.jpg">`));
    assert.equal(m.imagen, "https://cdn.medio.gt/foto.jpg");
  });

  test("si no hay og:image, usa twitter:image", () => {
    const m = leerMetadatos(pagina(`<meta name="twitter:image" content="https://cdn.medio.gt/tw.jpg">`));
    assert.equal(m.imagen, "https://cdn.medio.gt/tw.jpg");
  });

  test("una imagen por http no se propone", () => {
    const m = leerMetadatos(pagina(`<meta property="og:image" content="http://cdn.medio.gt/foto.jpg">`));
    assert.equal(m.imagen, null);
  });

  // Rutas relativas, esquemas raros: nada que no sea https absoluto.
  test("tampoco una ruta relativa ni otro esquema", () => {
    for (const contenido of ["/fotos/a.jpg", "//cdn.medio.gt/a.jpg", "data:image/png;base64,AAAA", "javascript:alert(1)"]) {
      const m = leerMetadatos(pagina(`<meta property="og:image" content="${contenido}">`));
      assert.equal(m.imagen, null, contenido);
    }
  });

  test("sin imagen declarada, null", () => {
    assert.equal(leerMetadatos(pagina("")).imagen, null);
  });
});
