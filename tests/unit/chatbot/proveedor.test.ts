// ===========================================================================
// Fase 4 — El puerto del modelo (ADR 0005)
//
// Lo que se comprueba aquí no es que los modelos contesten bien, es que la
// conmutación entre modos no cambie el comportamiento de la defensa y que el
// modo de desarrollo no se pueda colar a producción.
// ===========================================================================

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import type OpenAI from "openai";

import {
  calcularCosto,
  ConfiguracionInvalida,
  crearProveedor,
  crearProveedorOpenAI,
  crearProveedorSuscripcion,
  interpretarModo,
  medirCostoOpenAI,
  MODELO_DE_SUSCRIPCION,
  MODELOS_OPENAI_POR_OMISION,
  PRECIOS_POR_MILLON,
  sumarCostos,
  validarClasificacion,
  validarRespuesta,
} from "../../../src/modules/chatbot/proveedor/index.ts";
import { COSTO_CERO } from "../../../src/modules/chatbot/index.ts";
import { PROMPT_DEL_CLASIFICADOR } from "../../../src/modules/chatbot/prompt.ts";

describe("interpretacion del modo", () => {
  test("acepta los tres modos", () => {
    assert.equal(interpretarModo("api"), "api");
    assert.equal(interpretarModo("suscripcion"), "suscripcion");
    assert.equal(interpretarModo("openai"), "openai");
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

  // La vista `vista_gasto_api` excluye LITERALMENTE la cadena 'suscripcion'
  // (migración 20261003120000). Si alguien renombra la marca en el código y no
  // en la base, el desarrollo local empieza a gastar el presupuesto del
  // despliegue con costos que son solo estimados. Esta prueba lo impide.
  test("marca sus turnos con la cadena exacta que la vista del gasto excluye", async () => {
    assert.equal(MODELO_DE_SUSCRIPCION, "suscripcion");

    const p = conTexto('{"respuesta":"Hola","noticias_citadas":[],"confianza":"alta"}');
    const r = await p.responder({ mensaje: "hola", noticias: [], historial: [], tareaAjenaANegar: null });
    assert.equal(r.costo.modelo, MODELO_DE_SUSCRIPCION);
  });
});

// ===========================================================================

describe("el modo openai", () => {
  type Llamada = Record<string, unknown>;

  /** Un cliente falso: guarda lo que se le pidió y devuelve lo que se le diga. */
  function clienteFalso(respuesta: Partial<OpenAI.Responses.Response>) {
    const llamadas: Llamada[] = [];
    const cliente = {
      responses: {
        create: async (parametros: Llamada) => {
          llamadas.push(parametros);
          return { status: "completed", output: [], output_text: "", ...respuesta };
        },
      },
    } as unknown as Pick<OpenAI, "responses">;
    return { cliente, llamadas };
  }

  const uso = (entrada: number, cache: number, salida: number) =>
    ({
      input_tokens: entrada,
      input_tokens_details: { cached_tokens: cache },
      output_tokens: salida,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: entrada + salida,
    }) as OpenAI.Responses.ResponseUsage;

  const conNegativa = (texto: string) =>
    [
      { type: "message", role: "assistant", content: [{ type: "refusal", refusal: texto }] },
    ] as unknown as OpenAI.Responses.ResponseOutputItem[];

  test("exige la llave", () => {
    assert.throws(
      () => crearProveedor({ modo: "openai", esProduccion: true, openai: { llave: undefined } }),
      /OPENAI_API_KEY/,
    );
  });

  test("con llave arranca y se declara apto para desplegar", () => {
    const p = crearProveedor({
      modo: "openai",
      esProduccion: true,
      openai: { llave: "sk-de-mentira-para-la-prueba" },
    });
    assert.equal(p.aptoParaDespliegue, true);
    assert.match(p.nombre, /^openai:/);
  });

  // Un modelo que no está en la tabla cuesta cero, y entonces el tope de gasto
  // no lo ve. Esta prueba impide cambiar el modelo por omisión sin su precio.
  test("los modelos por omisión tienen precio, así que el tope de gasto los ve", () => {
    for (const modelo of Object.values(MODELOS_OPENAI_POR_OMISION)) {
      assert.ok(PRECIOS_POR_MILLON[modelo] !== undefined, `falta el precio de ${modelo}`);
    }
  });

  // OpenAI cuenta la caché adentro de la entrada; si no se separa, se cobra dos veces.
  test("separa lo leído de caché de la entrada", () => {
    const costo = medirCostoOpenAI("gpt-6-luna", uso(1_000, 400, 100), 50);
    assert.equal(costo.tokensEntrada, 600);
    assert.equal(costo.tokensCache, 400);
    assert.equal(costo.tokensSalida, 100);
    // 600 × 0,10 + 400 × 0,01 + 100 × 0,50, por millón.
    assert.ok(Math.abs(costo.costoUsd - 0.000114) < 1e-12);
  });

  test("sin uso reportado, el costo es cero y no revienta", () => {
    assert.equal(medirCostoOpenAI("gpt-6-luna", undefined, 10).costoUsd, 0);
  });

  test("pide salida estricta, sin guardar nada en OpenAI, y valida lo que vuelve", async () => {
    const { cliente, llamadas } = clienteFalso({
      output_text: JSON.stringify({
        categoria: "consulta_noticias",
        parte_legitima: "qué pasó hoy",
        tarea_ajena: null,
        razonamiento: "Pregunta por noticias.",
      }),
      usage: uso(800, 0, 60),
    });
    const p = crearProveedorOpenAI({ cliente, modeloGuardia: "gpt-6-luna", modeloRespuesta: "gpt-6.1-sol" });

    const r = await p.clasificar({ mensaje: "¿qué pasó hoy?", sospechas: [] });
    assert.equal(r.valor.categoria, "consulta_noticias");
    assert.equal(r.costo.modelo, "gpt-6-luna");
    assert.ok(r.costo.costoUsd > 0);

    const pedido = llamadas[0] as {
      model: string;
      instructions: string;
      store: boolean;
      input: { role: string; content: string }[];
      text: { format: { type: string; strict: boolean } };
    };
    assert.equal(pedido.model, "gpt-6-luna");
    assert.equal(pedido.store, false);
    assert.equal(pedido.instructions, PROMPT_DEL_CLASIFICADOR);
    assert.equal(pedido.text.format.type, "json_schema");
    assert.equal(pedido.text.format.strict, true);
    // El mensaje del usuario va delimitado, nunca suelto junto a las instrucciones.
    assert.match(pedido.input[0]!.content, /<mensaje_a_clasificar>\n¿qué pasó hoy\?\n<\/mensaje_a_clasificar>/);
  });

  test("si el clasificador se niega, es contenido dañino: negativa amable, no un error", async () => {
    const { cliente } = clienteFalso({ output: conNegativa("No puedo ayudar con eso."), usage: uso(800, 0, 10) });
    const p = crearProveedorOpenAI({ cliente });

    const r = await p.clasificar({ mensaje: "algo dañino", sospechas: [] });
    assert.equal(r.valor.categoria, "contenido_dañino");
    assert.match(r.valor.razonamiento, /se negó/);
  });

  test("una respuesta cortada por el tope de tokens es un error, no un JSON a medias", async () => {
    const { cliente } = clienteFalso({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_text: '{"respuesta": "Hoy',
    });
    const p = crearProveedorOpenAI({ cliente });
    await assert.rejects(
      () => p.responder({ mensaje: "hola", noticias: [], historial: [], tareaAjenaANegar: null }),
      /cortó la respuesta/,
    );
  });

  test("una negativa al responder se dice, no se disfraza de respuesta vacía", async () => {
    const { cliente } = clienteFalso({ output: conNegativa("No.") });
    const p = crearProveedorOpenAI({ cliente });
    await assert.rejects(
      () => p.responder({ mensaje: "hola", noticias: [], historial: [], tareaAjenaANegar: null }),
      /se negó a responder/,
    );
  });

  test("responde con el historial en orden y valida la respuesta", async () => {
    const { cliente, llamadas } = clienteFalso({
      output_text: JSON.stringify({ respuesta: "Hoy...", noticias_citadas: ["n-1"], confianza: "alta" }),
      usage: uso(3_000, 1_200, 400),
    });
    const p = crearProveedorOpenAI({ cliente });

    const r = await p.responder({
      mensaje: "¿y después?",
      noticias: [],
      historial: [
        { rol: "usuario", contenido: "¿qué pasó?" },
        { rol: "asistente", contenido: "Esto pasó." },
      ],
      tareaAjenaANegar: null,
    });
    assert.deepEqual(r.valor.noticias_citadas, ["n-1"]);

    const pedido = llamadas[0] as { store: boolean; input: { role: string }[] };
    assert.equal(pedido.store, false);
    assert.deepEqual(
      pedido.input.map((m) => m.role),
      ["user", "assistant", "user"],
    );
  });
});
