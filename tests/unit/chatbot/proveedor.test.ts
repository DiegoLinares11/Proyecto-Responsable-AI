// ===========================================================================
// Fase 4 — El puerto del modelo (ADR 0005)
//
// Lo que se comprueba aquí no es que los modelos contesten bien, es que la
// conmutación entre modos no cambie el comportamiento de la defensa y que el
// modo de desarrollo no se pueda colar a producción.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  calcularCosto,
  ConfiguracionInvalida,
  crearProveedor,
  crearProveedorSuscripcion,
  interpretarModo,
  sumarCostos,
  validarClasificacion,
  validarRespuesta,
} from "../../../src/modules/chatbot/proveedor/index.ts";
import { COSTO_CERO } from "../../../src/modules/chatbot/index.ts";

describe("interpretacion del modo", () => {
  test("acepta los dos modos", () => {
    assert.equal(interpretarModo("api"), "api");
    assert.equal(interpretarModo("suscripcion"), "suscripcion");
    assert.equal(interpretarModo("  API  "), "api");
  });

  // No hay valor por omision a proposito: el modo decide de donde sale el dinero.
  test("exige que este definido", () => {
    assert.throws(() => interpretarModo(undefined), ConfiguracionInvalida);
    assert.throws(() => interpretarModo(""), /Falta LLM_MODO/);
  });

  test("rechaza un modo inventado", () => {
    assert.throws(() => interpretarModo("gratis"), /no reconoce/);
  });
});

describe("la guarda de produccion", () => {
  // Un despliegue en modo suscripcion funcionaria —por un rato, y contra la
  // sesion de alguien— y ese es exactamente el fallo que no se quiere:
  // silencioso, y del lado de incumplir las condiciones de uso.
  test("el modo suscripcion no arranca en produccion", () => {
    assert.throws(
      () => crearProveedor({ modo: "suscripcion", esProduccion: true }),
      (e: Error) => {
        assert.ok(e instanceof ConfiguracionInvalida);
        assert.match(e.message, /necesita cr[eé]dito de API/);
        assert.match(e.message, /0005/);
        return true;
      },
    );
  });

  test("en local si arranca", () => {
    const p = crearProveedor({ modo: "suscripcion", esProduccion: false });
    assert.equal(p.aptoParaDespliegue, false);
    assert.match(p.nombre, /suscripcion/);
  });

  test("el modo api exige la llave", () => {
    assert.throws(
      () => crearProveedor({ modo: "api", esProduccion: true, api: { llave: undefined } }),
      /ANTHROPIC_API_KEY/,
    );
  });

  test("con llave, el modo api arranca y se declara apto", () => {
    const p = crearProveedor({
      modo: "api",
      esProduccion: true,
      api: { llave: "sk-ant-de-mentira-para-la-prueba" },
    });
    assert.equal(p.aptoParaDespliegue, true);
    assert.match(p.nombre, /^api:/);
  });
});

// ===========================================================================

describe("validacion de lo que devuelve el modelo", () => {
  // Ante lo desconocido, la opcion segura: atiende la parte legitima y niega el
  // resto. Tratarlo como consulta legitima convertiria un valor corrupto en via
  // libre.
  test("una categoria desconocida se trata como intento de desvio", () => {
    for (const crudo of [
      { categoria: "todo_bien" },
      { categoria: 42 },
      {},
      null,
      "no es un objeto",
    ]) {
      assert.equal(validarClasificacion(crudo).categoria, "intento_desvio");
    }
    assert.match(validarClasificacion({ categoria: "x" }).razonamiento, /desconocida/);
  });

  test("las categorias validas pasan tal cual", () => {
    for (const categoria of [
      "consulta_noticias",
      "cortesia",
      "fuera_de_dominio",
      "intento_desvio",
      "contenido_dañino",
    ] as const) {
      assert.equal(validarClasificacion({ categoria }).categoria, categoria);
    }
  });

  test("una confianza desconocida baja a la minima", () => {
    assert.equal(validarRespuesta({ confianza: "altisima" }).confianza, "baja");
    assert.equal(validarRespuesta({}).confianza, "baja");
    assert.equal(validarRespuesta({ confianza: "alta" }).confianza, "alta");
  });

  // La capa 3 cruza esta lista contra la base; si llega con basura adentro, su
  // comprobacion deja de significar lo que dice.
  test("las citas que no son cadenas se descartan", () => {
    const r = validarRespuesta({ noticias_citadas: ["n-1", 42, null, "", "  ", "n-2"] });
    assert.deepEqual(r.noticias_citadas, ["n-1", "n-2"]);
  });

  test("una respuesta sin texto queda vacia, no undefined", () => {
    assert.equal(validarRespuesta({}).respuesta, "");
    assert.equal(validarRespuesta({ respuesta: 99 }).respuesta, "");
  });
});

// ===========================================================================

describe("costos", () => {
  test("calcula con los precios por millon", () => {
    // 1M de entrada de Haiku son 1 dólar.
    assert.equal(calcularCosto("claude-haiku-4-5", 1_000_000, 0, 0), 1);
    assert.equal(calcularCosto("claude-haiku-4-5", 0, 1_000_000, 0), 5);
    assert.equal(calcularCosto("claude-sonnet-5", 1_000_000, 0, 0), 2);
    // Lo leído de caché cuesta una fracción: es lo que hace que un prompt del
    // sistema estable sea a la vez la decisión segura y la barata.
    assert.equal(calcularCosto("claude-sonnet-5", 0, 0, 1_000_000), 0.2);
  });

  test("un modelo que no esta en la tabla no revienta, cuesta cero", () => {
    assert.equal(calcularCosto("modelo-inventado", 1_000_000, 1_000_000, 0), 0);
  });

  test("suma los costos de las capas del turno", () => {
    const guardia = {
      modelo: "claude-haiku-4-5",
      tokensEntrada: 500,
      tokensSalida: 40,
      tokensCache: 500,
      costoUsd: 0.0004,
      latenciaMs: 120,
    };
    const respuesta = {
      modelo: "claude-sonnet-5",
      tokensEntrada: 3000,
      tokensSalida: 400,
      tokensCache: 1200,
      costoUsd: 0.0106,
      latenciaMs: 1800,
    };

    const total = sumarCostos(guardia, respuesta);
    assert.equal(total.tokensEntrada, 3500);
    assert.equal(total.tokensSalida, 440);
    assert.equal(total.latenciaMs, 1920);
    assert.ok(Math.abs(total.costoUsd - 0.011) < 1e-9);
  });

  test("sumar nada da cero", () => {
    assert.deepEqual(sumarCostos(), COSTO_CERO);
  });
});

// ===========================================================================

describe("el modo suscripcion sin salida estructurada", () => {
  const conTexto = (texto: string) =>
    crearProveedorSuscripcion({
      consultar: async () => ({
        texto,
        costoUsd: 0.002,
        latenciaMs: 900,
        tokensEntrada: 1200,
        tokensSalida: 200,
      }),
    });

  test("parsea el JSON que devuelve el modelo", async () => {
    const p = conTexto('{"respuesta":"Hola","noticias_citadas":["n-1"],"confianza":"alta"}');
    const r = await p.responder({ mensaje: "hola", noticias: [], historial: [], tareaAjenaANegar: null });

    assert.equal(r.valor.respuesta, "Hola");
    assert.deepEqual(r.valor.noticias_citadas, ["n-1"]);
  });

  // El Agent SDK no expone output_config, asi que el modelo puede cercar el JSON
  // en un bloque de codigo. Se limpia en vez de fallar.
  test("tolera que el modelo cerque el JSON en un bloque", async () => {
    const p = conTexto('```json\n{"respuesta":"Hola","noticias_citadas":[],"confianza":"media"}\n```');
    const r = await p.responder({ mensaje: "hola", noticias: [], historial: [], tareaAjenaANegar: null });
    assert.equal(r.valor.confianza, "media");
  });

  // Y si devuelve algo que no es JSON, el error dice por qué puede pasar en este
  // modo y no en el otro. Es la diferencia que el ADR pide tener presente.
  test("si no es JSON, el error explica que es una limitacion del modo", async () => {
    const p = conTexto("Claro, aquí tienes la respuesta en prosa.");
    await assert.rejects(
      () => p.responder({ mensaje: "hola", noticias: [], historial: [], tareaAjenaANegar: null }),
      /mediciones formales corren en modo api/,
    );
  });

  test("se declara no apto para despliegue", () => {
    assert.equal(conTexto("{}").aptoParaDespliegue, false);
  });
});
