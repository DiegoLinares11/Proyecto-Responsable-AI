// ===========================================================================
// Fotos de archivo con licencia libre (R-10)
//
// Las respuestas imitan la forma de la API real de Wikimedia Commons (se
// consultó el 12 de octubre con «incendio forestal»). Sin red: lo que se prueba
// es qué deja pasar el módulo, no Commons.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  aTexto,
  buscarEnCommons,
  interpretarRespuesta,
  licenciaEsLibre,
  verificarArchivo,
} from "../../../src/modules/imagenes/commons.ts";

function pagina(cambios: {
  titulo?: string;
  thumb?: string;
  fuente?: string;
  mime?: string;
  licencia?: string;
  autor?: string;
  descripcion?: string;
}) {
  return {
    title: cambios.titulo ?? "File:Incendio forestal en Galicia.jpg",
    imageinfo: [
      {
        thumburl:
          cambios.thumb ??
          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Incendio.jpg/960px-Incendio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo",
        descriptionurl: cambios.fuente ?? "https://commons.wikimedia.org/wiki/File:Incendio_forestal_en_Galicia.jpg",
        mime: cambios.mime ?? "image/jpeg",
        extmetadata: {
          LicenseShortName: { value: cambios.licencia ?? "CC BY 4.0" },
          Artist: {
            value:
              cambios.autor ??
              '<a href="//commons.wikimedia.org/wiki/User:SusoRedondo" title="User:SusoRedondo">SusoRedondo</a>',
          },
          ImageDescription: { value: cambios.descripcion ?? "Several forest rangers escape the ferocity of the fire." },
        },
      },
    ],
  };
}

const respuesta = (...paginas: unknown[]) => ({ query: { pages: paginas } });

describe("qué licencias pasan", () => {
  test("CC0, dominio público, CC BY y CC BY-SA son libres", () => {
    for (const l of ["CC0", "CC0 1.0", "Public domain", "PD-USGov", "CC BY 4.0", "CC BY-SA 2.0", "CC BY-SA 3.0 es"]) {
      assert.equal(licenciaEsLibre(l), true, l);
    }
  });

  test("lo no comercial, sin derivados o desconocido no pasa", () => {
    for (const l of ["CC BY-NC 4.0", "CC BY-NC-SA 3.0", "CC BY-ND 2.0", "All rights reserved", "", "Fair use"]) {
      assert.equal(licenciaEsLibre(l), false, l);
    }
  });
});

describe("lo que se rescata de una respuesta", () => {
  test("una foto libre sale con autor, licencia y crédito armado acá", () => {
    const [foto] = interpretarRespuesta(respuesta(pagina({})));
    assert.ok(foto);
    assert.equal(foto.autor, "SusoRedondo");
    assert.equal(foto.licencia, "CC BY 4.0");
    assert.equal(foto.credito, "SusoRedondo · CC BY 4.0 · Wikimedia Commons");
    assert.equal(foto.urlFuente, "https://commons.wikimedia.org/wiki/File:Incendio_forestal_en_Galicia.jpg");
    assert.equal(foto.alterno, "Several forest rangers escape the ferocity of the fire.");
  });

  test("la miniatura se guarda sin los parámetros de seguimiento", () => {
    const [foto] = interpretarRespuesta(respuesta(pagina({})));
    assert.ok(foto);
    assert.ok(!foto.url.includes("utm_"), foto.url);
    assert.ok(foto.url.startsWith("https://"));
  });

  test("se descartan licencias no libres, autores vacíos, SVG y miniaturas por http", () => {
    const fotos = interpretarRespuesta(
      respuesta(
        pagina({ licencia: "CC BY-NC 2.0" }),
        pagina({ autor: "" }),
        pagina({ mime: "image/svg+xml" }),
        pagina({ thumb: "http://upload.wikimedia.org/x.jpg" }),
        pagina({ fuente: "https://otro-sitio.org/File:x.jpg" }),
      ),
    );
    assert.deepEqual(fotos, []);
  });

  test("sin descripción, el texto alternativo sale del nombre del archivo", () => {
    const [foto] = interpretarRespuesta(respuesta(pagina({ descripcion: "", titulo: "File:Brigada_en_Peten.jpg" })));
    assert.equal(foto?.alterno, "Brigada en Peten");
  });

  test("una respuesta rota no tira error: no hay fotos", () => {
    assert.deepEqual(interpretarRespuesta(null), []);
    assert.deepEqual(interpretarRespuesta({ error: { code: "x" } }), []);
  });

  test("el HTML del autor queda en texto", () => {
    assert.equal(aTexto('<a href="x">Contando Estrelas</a> from Vigo &amp; Galicia'), "Contando Estrelas from Vigo & Galicia");
  });
});

describe("las llamadas", () => {
  test("la búsqueda se identifica ante Wikimedia y pide solo archivos", async () => {
    let pedido = "";
    let agente = "";
    const falso = (async (url: string, opciones: RequestInit) => {
      pedido = url;
      agente = new Headers(opciones.headers).get("User-Agent") ?? "";
      return new Response(JSON.stringify(respuesta(pagina({}))));
    }) as unknown as typeof fetch;

    const fotos = await buscarEnCommons("incendio forestal", falso);
    assert.equal(fotos.length, 1);
    assert.ok(pedido.includes("gsrnamespace=6"), pedido);
    assert.ok(agente.startsWith("NoticiasVerificadas/"), agente);
  });

  test("una búsqueda de menos de 3 letras no llama a nadie", async () => {
    const falso = (async () => assert.fail("no debía llamar")) as unknown as typeof fetch;
    assert.deepEqual(await buscarEnCommons("ab", falso), []);
  });

  test("al guardar se vuelve a consultar el archivo: el formulario no decide el crédito", async () => {
    let pedido = "";
    const falso = (async (url: string) => {
      pedido = url;
      return new Response(JSON.stringify(respuesta(pagina({ licencia: "CC BY-SA 4.0" }))));
    }) as unknown as typeof fetch;

    const foto = await verificarArchivo("https://commons.wikimedia.org/wiki/File:Incendio_forestal_en_Galicia.jpg", falso);
    assert.equal(foto?.licencia, "CC BY-SA 4.0");
    assert.equal(new URL(pedido).searchParams.get("titles"), "File:Incendio forestal en Galicia.jpg");
  });

  test("un enlace que no es de un archivo de Commons no se consulta", async () => {
    const falso = (async () => assert.fail("no debía llamar")) as unknown as typeof fetch;
    assert.equal(await verificarArchivo("https://ejemplo.org/File:x.jpg", falso), null);
    assert.equal(await verificarArchivo("https://commons.wikimedia.org/wiki/Main_Page", falso), null);
  });
});
