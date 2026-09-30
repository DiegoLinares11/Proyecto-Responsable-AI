// ===========================================================================
// Corroboración contra los feeds del registro
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  crearBuscadorEnFeeds,
  leerItemsDeFeed,
  similitudDeTitulos,
  terminosCoincidentes,
  type FuenteConFeed,
} from "../../../src/modules/validacion/index.ts";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Prensa Libre</title>
  <item>
    <title><![CDATA[Arévalo sanciona la exención de impuestos a los combustibles]]></title>
    <link>https://www.prensalibre.com/economia/arevalo-combustibles/</link>
  </item>
  <item>
    <title>Suben los precios del café en el mercado internacional</title>
    <link>https://www.prensalibre.com/economia/cafe/</link>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title type="html">Ar&#233;valo firma el decreto de combustibles</title>
    <link rel="alternate" href="https://lahora.gt/nota/decreto"/>
  </entry>
</feed>`;

describe("lectura de feeds", () => {
  test("lee RSS con CDATA", () => {
    const items = leerItemsDeFeed(RSS);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.titulo, "Arévalo sanciona la exención de impuestos a los combustibles");
    assert.equal(items[0]?.enlace, "https://www.prensalibre.com/economia/arevalo-combustibles/");
  });

  test("lee Atom, donde el enlace es un atributo", () => {
    const items = leerItemsDeFeed(ATOM);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.enlace, "https://lahora.gt/nota/decreto");
    assert.match(items[0]?.titulo ?? "", /Arévalo/);
  });

  test("un feed roto da menos entradas, no una excepcion", () => {
    assert.deepEqual(leerItemsDeFeed("<rss><channel><item>sin titulo</item></channel></rss>"), []);
    assert.deepEqual(leerItemsDeFeed("esto no es xml"), []);
    assert.deepEqual(leerItemsDeFeed(""), []);
  });
});

describe("coincidencia de terminos", () => {
  test("compara palabras completas, no subcadenas", () => {
    // «paro» no debe coincidir con «comparo».
    assert.deepEqual(terminosCoincidentes("paro nacional", "Comparo los resultados"), []);
    assert.deepEqual(terminosCoincidentes("paro nacional", "Paro nacional de transportistas").sort(), [
      "nacional",
      "paro",
    ]);
  });

  test("ignora acentos y mayusculas", () => {
    assert.deepEqual(terminosCoincidentes("arevalo", "ARÉVALO firma"), ["arevalo"]);
  });
});

const TITULAR = "Arévalo sanciona el decreto que exonera de impuestos a los combustibles";
const pedido = (titulo: string) => ({
  terminos: titulo.split(/s+/).filter((t) => t.length >= 3),
  titulo,
});

describe("buscador sobre los feeds", () => {
  const FUENTES: FuenteConFeed[] = [
    { dominio: "prensalibre.com", urlRss: "https://pl/feed" },
    { dominio: "lahora.gt", urlRss: "https://lh/feed" },
  ];

  const conFeeds = (
    cuerpos: Record<string, string | number>,
    fuentes: FuenteConFeed[] = FUENTES,
  ) =>
    crearBuscadorEnFeeds({
      listarFuentes: async () => fuentes,
      buscar: (async (entrada: string | URL) => {
        const cuerpo = cuerpos[entrada.toString()];
        if (cuerpo === undefined) return new Response("", { status: 404 });
        if (typeof cuerpo === "number") return new Response("", { status: cuerpo });
        return new Response(cuerpo, { status: 200 });
      }) as unknown as typeof fetch,
    });

  test("encuentra el hecho en dos medios distintos", async () => {
    const buscar = conFeeds({ "https://pl/feed": RSS, "https://lh/feed": ATOM });
    const articulos = await buscar(pedido(TITULAR));

    const dominios = [...new Set(articulos.map((a) => a.dominio))].sort();
    assert.deepEqual(dominios, ["lahora.gt", "prensalibre.com"]);
  });

  test("descarta las entradas que hablan de otra cosa", async () => {
    const buscar = conFeeds({ "https://pl/feed": RSS, "https://lh/feed": ATOM });
    const articulos = await buscar(pedido(TITULAR));

    assert.ok(
      !articulos.some((a) => /caf[ée]/i.test(a.titulo)),
      "la nota del cafe no cubre el mismo hecho",
    );
  });

  // Con un solo termino coincidente, cualquier nota que diga «Guatemala»
  // contaria como corroboracion.
  test("un termino suelto no alcanza", async () => {
    const buscar = conFeeds({ "https://pl/feed": RSS, "https://lh/feed": ATOM });
    const articulos = await buscar(
      pedido("Escasez de combustibles en el aeropuerto internacional"),
    );
    assert.equal(articulos.length, 0);
  });

  test("el dominio es el del medio dueno del feed, no el del enlace", async () => {
    const conRedireccion = `<rss><channel><item>
      <title>Arévalo sanciona el decreto de combustibles</title>
      <link>https://acortador.xyz/abc123</link>
    </item></channel></rss>`;

    const buscar = conFeeds({ "https://pl/feed": conRedireccion, "https://lh/feed": ATOM });
    const articulos = await buscar(pedido(TITULAR));

    assert.ok(articulos.some((a) => a.dominio === "prensalibre.com"));
    assert.ok(!articulos.some((a) => a.dominio.includes("acortador")));
  });

  test("que falle un feed no invalida los demas", async () => {
    const buscar = conFeeds({ "https://pl/feed": RSS, "https://lh/feed": 503 });
    const articulos = await buscar(pedido(TITULAR));
    assert.ok(articulos.length > 0);
    assert.deepEqual([...new Set(articulos.map((a) => a.dominio))], ["prensalibre.com"]);
  });

  test("que fallen todos si es no-se-pudo-averiguar", async () => {
    const buscar = conFeeds({ "https://pl/feed": 503, "https://lh/feed": 500 });
    await assert.rejects(() => buscar(pedido(TITULAR)), /Ning[úu]n feed/);
  });

  test("sin medios con feed, la via no esta disponible", async () => {
    const buscar = conFeeds({}, []);
    await assert.rejects(() => buscar(pedido(TITULAR)), /tiene feed configurado/);
  });

  test("no vuelve a descargar el mismo feed dentro de la tanda", async () => {
    let descargas = 0;
    const buscar = crearBuscadorEnFeeds({
      listarFuentes: async () => FUENTES,
      buscar: (async () => {
        descargas++;
        return new Response(RSS, { status: 200 });
      }) as unknown as typeof fetch,
    });

    await buscar(pedido(TITULAR));
    await buscar(pedido(TITULAR));
    await buscar(pedido("Suben los precios del café en el mercado internacional"));

    assert.equal(descargas, 2, "dos feeds, una descarga cada uno");
  });
});

// ===========================================================================
// Calibracion del umbral, con titulares reales
//
// Estos pares salieron de los feeds de verdad el 2026-09-30. Fijan el umbral:
// si alguien lo sube, el primer par deja de corroborar; si lo baja demasiado,
// el ultimo empieza a corroborar cosas que no son el mismo hecho.
// ===========================================================================

describe("calibracion contra titulares reales", () => {
  const MISMO_HECHO: ReadonlyArray<readonly [string, string]> = [
    [
      "Jenny Alvarado Teni presidirá la CSJ con retos de credibilidad e independencia en el futuro periodo electoral",
      "Jenny Alvarado por próximo proceso electoral: «Estamos consientes que también hay retos»",
    ],
    [
      "Qué se sabe sobre el apuñalamiento en un vuelo rumbo a Israel que califican como intento de atentado terrorista",
      "Netanyahu afirma que un piloto apuñaló a otro durante un vuelo con destino a Israel",
    ],
  ];

  const HECHOS_DISTINTOS: ReadonlyArray<readonly [string, string]> = [
    [
      "Jenny Alvarado Teni presidirá la CSJ con retos de credibilidad e independencia en el futuro periodo electoral",
      "Arévalo sanciona decreto que exonera temporalmente de impuestos a los combustibles",
    ],
    [
      "Arévalo confirma participación del Ejército en hechos armados en Huité",
      "Suben los precios del café en el mercado internacional",
    ],
  ];

  const UMBRAL = 0.25;

  test("dos medios sobre el mismo hecho quedan por encima del umbral", () => {
    for (const [a, b] of MISMO_HECHO) {
      const parecido = similitudDeTitulos(a, b);
      assert.ok(
        parecido >= UMBRAL,
        `deberia corroborar y dio ${parecido.toFixed(3)}:\n  ${a}\n  ${b}`,
      );
      assert.ok(terminosCoincidentes(a, b).length >= 2);
    }
  });

  test("dos hechos distintos quedan claramente por debajo", () => {
    for (const [a, b] of HECHOS_DISTINTOS) {
      const parecido = similitudDeTitulos(a, b);
      assert.ok(
        parecido < UMBRAL,
        `no deberia corroborar y dio ${parecido.toFixed(3)}:\n  ${a}\n  ${b}`,
      );
    }
  });
});
