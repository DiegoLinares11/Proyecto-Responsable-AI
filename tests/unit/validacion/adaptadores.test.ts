// ===========================================================================
// Adaptadores externos
//
// Estas pruebas nacieron de una corrida contra los servicios de verdad. GDELT
// respondió 429 con «Please limit requests to one every 5 seconds» y tardó 18
// segundos — con el tiempo límite de 10 que tenía el módulo, la señal de
// corroboración se caía casi siempre. Ninguna de las dos cosas se podía ver con
// dobles, y las dos quedaron cubiertas aquí para que no vuelvan.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  crearBuscadorDeCobertura,
  crearBuscadorDeDesmentidos,
  crearBuscadorDeFuentes,
  crearBuscadorEnCadena,
  type ConsultarFuentes,
} from "../../../src/modules/validacion/index.ts";

/** Reloj falso: `dormir` adelanta el tiempo en vez de esperarlo. */
function relojFalso() {
  let t = 0;
  return {
    ahora: () => t,
    dormir: async (ms: number) => {
      t += ms;
    },
    avanzar: (ms: number) => {
      t += ms;
    },
    leer: () => t,
  };
}

function respuestaGdelt(articulos: unknown[]): Response {
  return new Response(JSON.stringify({ articles: articulos }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("GDELT", () => {
  test("espacia las consultas seguidas para no recibir 429", async () => {
    const reloj = relojFalso();
    const momentos: number[] = [];

    const buscar = (async () => {
      momentos.push(reloj.leer());
      return respuestaGdelt([]);
    }) as unknown as typeof fetch;

    const buscarCobertura = crearBuscadorDeCobertura({
      buscar,
      separacionMinimaMs: 5_500,
      dormir: reloj.dormir,
      ahora: reloj.ahora,
    });

    await buscarCobertura("uno");
    await buscarCobertura("dos");
    await buscarCobertura("tres");

    assert.equal(momentos.length, 3);
    for (let i = 1; i < momentos.length; i++) {
      const separacion = momentos[i]! - momentos[i - 1]!;
      assert.ok(separacion >= 5_500, `la consulta ${i} salió ${separacion} ms después, muy pronto`);
    }
  });

  test("tambien espacia cuando las consultas salen en paralelo", async () => {
    const reloj = relojFalso();
    const momentos: number[] = [];
    const buscar = (async () => {
      momentos.push(reloj.leer());
      return respuestaGdelt([]);
    }) as unknown as typeof fetch;

    const buscarCobertura = crearBuscadorDeCobertura({
      buscar,
      separacionMinimaMs: 5_500,
      dormir: reloj.dormir,
      ahora: reloj.ahora,
    });

    await Promise.all([buscarCobertura("a"), buscarCobertura("b"), buscarCobertura("c")]);

    assert.equal(new Set(momentos).size, 3, "las tres salieron en el mismo instante");
  });

  test("reintenta una vez ante un 429 y luego se rinde con un mensaje util", async () => {
    const reloj = relojFalso();
    let llamadas = 0;

    const buscar = (async () => {
      llamadas++;
      if (llamadas === 1) return new Response("Please limit requests", { status: 429 });
      return respuestaGdelt([{ url: "https://reuters.com/a", domain: "reuters.com", title: "X" }]);
    }) as unknown as typeof fetch;

    const buscarCobertura = crearBuscadorDeCobertura({
      buscar,
      dormir: reloj.dormir,
      ahora: reloj.ahora,
    });

    const articulos = await buscarCobertura("consulta");
    assert.equal(llamadas, 2);
    assert.equal(articulos.length, 1);
  });

  // Medido contra el servicio real desde una red de oficina: 429 incluso con 25
  // segundos entre consultas. GDELT cuenta por IP, y detras de una NAT el cupo
  // lo consume todo el edificio. El mensaje tiene que decir eso, porque si no
  // el siguiente que lo vea va a perder la tarde subiendo la separacion.
  test("si el 429 persiste, el error apunta a la IP compartida y no al ritmo", async () => {
    const reloj = relojFalso();
    const buscar = (async () =>
      new Response("Please limit requests", { status: 429 })) as unknown as typeof fetch;

    const buscarCobertura = crearBuscadorDeCobertura({
      buscar,
      dormir: reloj.dormir,
      ahora: reloj.ahora,
    });

    await assert.rejects(() => buscarCobertura("consulta"), /direcci[oó]n IP/);
  });

  // GDELT contesta 200 con texto plano cuando la consulta no le gusta.
  test("un 200 que no es JSON se trata como fallo, no como cero resultados", async () => {
    const buscar = (async () =>
      new Response("Please limit requests to one every 5 seconds", {
        status: 200,
      })) as unknown as typeof fetch;

    const buscarCobertura = crearBuscadorDeCobertura({ buscar });
    await assert.rejects(() => buscarCobertura("consulta"), /no es JSON/);
  });

  test("descarta los articulos sin url o sin dominio", async () => {
    const buscar = (async () =>
      respuestaGdelt([
        { url: "https://reuters.com/a", domain: "reuters.com", title: "Bien" },
        { url: "https://sin-dominio.com/b", title: "Falta domain" },
        { domain: "sin-url.com", title: "Falta url" },
      ])) as unknown as typeof fetch;

    const articulos = await crearBuscadorDeCobertura({ buscar })("consulta");
    assert.equal(articulos.length, 1);
    assert.equal(articulos[0]?.dominio, "reuters.com");
  });
});

describe("verificador de desmentidos", () => {
  test("sin llave devuelve null, que es lo que frena la publicacion automatica", () => {
    assert.equal(crearBuscadorDeDesmentidos(undefined), null);
    assert.equal(crearBuscadorDeDesmentidos("   "), null);
    assert.notEqual(crearBuscadorDeDesmentidos("una-llave"), null);
  });

  test("aplana las revisiones de cada afirmacion", async () => {
    const buscar = (async () =>
      new Response(
        JSON.stringify({
          claims: [
            {
              text: "El gobierno dara un bono de 5000",
              claimReview: [
                { publisher: { name: "AFP Factual" }, url: "https://x/1", textualRating: "Falso" },
                { publisher: { site: "chequeado.com" }, url: "https://x/2", textualRating: "Engañoso" },
              ],
            },
            { text: "Sin revisiones", claimReview: [] },
          ],
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const buscarDesmentidos = crearBuscadorDeDesmentidos("llave", buscar);
    assert.notEqual(buscarDesmentidos, null);

    const hallazgos = await buscarDesmentidos!("bono 5000");
    assert.equal(hallazgos.length, 2);
    assert.equal(hallazgos[0]?.editor, "AFP Factual");
    assert.equal(hallazgos[1]?.editor, "chequeado.com");
  });
});

describe("registro de fuentes", () => {
  const FILAS = [
    { dominio: "prensalibre.com", nombre: "Prensa Libre", nivel: "medio_nacional", puntajeCredibilidad: 75 },
    { dominio: "noticias.prensalibre.com", nombre: "PL Noticias", nivel: "medio_nacional", puntajeCredibilidad: 80 },
  ];

  test("gana el candidato mas especifico", async () => {
    const consultar: ConsultarFuentes = async (dominios) =>
      FILAS.filter((f) => dominios.includes(f.dominio));

    const buscar = crearBuscadorDeFuentes(consultar);
    const fuente = await buscar(["noticias.prensalibre.com", "prensalibre.com"]);
    assert.equal(fuente?.nombre, "PL Noticias");
  });

  test("cae al dominio base cuando el subdominio no esta", async () => {
    const consultar: ConsultarFuentes = async (dominios) =>
      FILAS.filter((f) => f.dominio === "prensalibre.com" && dominios.includes(f.dominio));

    const buscar = crearBuscadorDeFuentes(consultar);
    const fuente = await buscar(["deportes.prensalibre.com", "prensalibre.com"]);
    assert.equal(fuente?.nombre, "Prensa Libre");
  });

  // La senal de corroboracion consulta el registro una vez por medio que
  // corrobora, y los mismos medios se repiten entre noticias de la misma tanda.
  test("no vuelve a preguntar por un dominio ya consultado", async () => {
    let veces = 0;
    const consultar: ConsultarFuentes = async (dominios) => {
      veces++;
      return FILAS.filter((f) => dominios.includes(f.dominio));
    };

    const buscar = crearBuscadorDeFuentes(consultar);
    await buscar(["prensalibre.com"]);
    await buscar(["prensalibre.com"]);
    await buscar(["prensalibre.com"]);

    assert.equal(veces, 1);
  });

  test("tambien recuerda los que NO estan en el registro", async () => {
    let veces = 0;
    const consultar: ConsultarFuentes = async () => {
      veces++;
      return [];
    };

    const buscar = crearBuscadorDeFuentes(consultar);
    assert.equal(await buscar(["desconocido.com"]), null);
    assert.equal(await buscar(["desconocido.com"]), null);
    assert.equal(veces, 1);
  });

  test("sin candidatos no consulta nada", async () => {
    let veces = 0;
    const buscar = crearBuscadorDeFuentes(async () => {
      veces++;
      return [];
    });
    assert.equal(await buscar([]), null);
    assert.equal(veces, 0);
  });
});

describe("cadena de proveedores de corroboracion", () => {
  const proveedor = (nombre: string, resultado: unknown) => ({
    nombre,
    buscar: async () => {
      if (resultado instanceof Error) throw resultado;
      return resultado as never;
    },
  });

  test("gana el primero que contesta", async () => {
    const cadena = crearBuscadorEnCadena([
      proveedor("uno", [{ url: "https://a.com/1", dominio: "a.com", titulo: "A" }]),
      proveedor("dos", [{ url: "https://b.com/1", dominio: "b.com", titulo: "B" }]),
    ]);
    const r = await cadena("consulta");
    assert.equal(r[0]?.dominio, "a.com");
  });

  test("pasa al siguiente cuando el primero falla", async () => {
    const cadena = crearBuscadorEnCadena([
      proveedor("gdelt", new Error("429 por IP compartida")),
      proveedor("respaldo", [{ url: "https://b.com/1", dominio: "b.com", titulo: "B" }]),
    ]);
    const r = await cadena("consulta");
    assert.equal(r[0]?.dominio, "b.com");
  });

  // Cero resultados es una RESPUESTA —nadie mas cubre el hecho— y no un fallo.
  // Si se tratara como fallo, el respaldo podria inventar corroboracion que el
  // primer proveedor ya habia descartado.
  test("cero articulos no hace saltar al siguiente proveedor", async () => {
    let consultadoElSegundo = false;
    const cadena = crearBuscadorEnCadena([
      proveedor("uno", []),
      {
        nombre: "dos",
        buscar: async () => {
          consultadoElSegundo = true;
          return [{ url: "https://b.com/1", dominio: "b.com", titulo: "B" }];
        },
      },
    ]);

    const r = await cadena("consulta");
    assert.equal(r.length, 0);
    assert.equal(consultadoElSegundo, false);
  });

  test("si fallan todos, el error los nombra a todos", async () => {
    const cadena = crearBuscadorEnCadena([
      proveedor("gdelt", new Error("429")),
      proveedor("respaldo", new Error("sin red")),
    ]);
    await assert.rejects(() => cadena("consulta"), (e: Error) => {
      assert.match(e.message, /gdelt: 429/);
      assert.match(e.message, /respaldo: sin red/);
      return true;
    });
  });

  test("una cadena vacia es un error de programacion, no de ejecucion", () => {
    assert.throws(() => crearBuscadorEnCadena([]), /al menos un proveedor/);
  });
});
