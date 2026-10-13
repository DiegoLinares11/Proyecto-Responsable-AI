// ===========================================================================
// Proveedor contra la API de OpenAI, con llave
//
// El tercer enchufe del puerto (ADR 0005). Recibe lo mismo y devuelve lo mismo
// que el de Anthropic: las cinco capas de defensa no se enteran de cuál de los
// dos está detrás. Lo que cambia es solo la llamada.
//
// Cuatro decisiones que valen explicación:
//
//   · **Salida estructurada estricta.** Los mismos esquemas de prompt.ts, con
//     `strict: true`: el servidor de OpenAI no deja salir un JSON que no los
//     cumpla. Igual se valida después, con la misma función que el otro
//     proveedor, porque esa promesa es la del ADR.
//
//   · **`store: false`.** La API de respuestas guarda por omisión cada
//     respuesta al menos 30 días. Las preguntas de los usuarios no tienen por
//     qué quedarse en otro servidor: acá no se guarda nada.
//
//   · **Razonamiento bajo.** Estos modelos razonan antes de contestar y ese
//     razonamiento se cobra como salida. Para etiquetar un mensaje o resumir
//     noticias que ya se le dieron alcanza con poco; si el red team muestra que
//     el modelo se desvía, aquí es donde se sube.
//
//   · **Una negativa del clasificador es «contenido_dañino».** Si el modelo se
//     niega a etiquetar un mensaje, es porque lo juzgó dañino. Tratarlo como un
//     error dejaría al usuario sin respuesta; tratarlo como consulta legítima
//     sería vía libre. Lo seguro es la negativa amable.
//
// Sin herramientas, como el otro: el modelo recibe las noticias ya recuperadas
// y no tiene con qué buscar, ejecutar ni salir a la red.
// ===========================================================================

import OpenAI from "openai";

import {
  ESQUEMA_DE_CLASIFICACION,
  ESQUEMA_DE_RESPUESTA,
  PROMPT_DEL_CLASIFICADOR,
  PROMPT_DEL_SISTEMA,
  armarTurnoDeRespuesta,
} from "../prompt.ts";
import type { CostoDelTurno, RespuestaDelModelo, VeredictoCapa1 } from "../tipos.ts";
import { validarClasificacion, validarRespuesta } from "./validacion.ts";
import {
  calcularCosto,
  ConfiguracionInvalida,
  type PeticionDeClasificacion,
  type PeticionDeRespuesta,
  type ProveedorLlm,
  type Respondido,
} from "./tipos.ts";

export type OpcionesProveedorOpenAI = {
  llave?: string | undefined;
  modeloGuardia?: string;
  modeloRespuesta?: string;
  cliente?: Pick<OpenAI, "responses">;
};

/** El modelo chico para etiquetar y el mediano para responder, como en el otro modo. */
export const MODELOS_OPENAI_POR_OMISION = {
  guardia: "gpt-6-luna",
  respuesta: "gpt-6.1-sol",
} as const;

/**
 * OpenAI cuenta lo leído de caché DENTRO de los tokens de entrada; la tabla de
 * precios los separa. Acá se separan para no cobrar dos veces lo mismo.
 */
export function medirCostoOpenAI(
  modelo: string,
  uso: OpenAI.Responses.ResponseUsage | undefined,
  latenciaMs: number,
): CostoDelTurno {
  const entradaTotal = uso?.input_tokens ?? 0;
  const cache = Math.min(uso?.input_tokens_details?.cached_tokens ?? 0, entradaTotal);
  const entrada = entradaTotal - cache;
  // Incluye los tokens de razonamiento: se cobran como salida.
  const salida = uso?.output_tokens ?? 0;

  return {
    modelo,
    tokensEntrada: entrada,
    tokensSalida: salida,
    tokensCache: cache,
    costoUsd: calcularCosto(modelo, entrada, salida, cache),
    latenciaMs,
  };
}

/** El texto de la negativa, si el modelo se negó en vez de contestar. */
function negativaDe(respuesta: OpenAI.Responses.Response): string | null {
  for (const salida of respuesta.output) {
    if (salida.type !== "message") continue;
    for (const parte of salida.content) {
      if (parte.type === "refusal") return parte.refusal;
    }
  }
  return null;
}

/** Saca el JSON de la respuesta. Viene con esquema estricto, pero igual se valida. */
function extraerJson(respuesta: OpenAI.Responses.Response): unknown {
  if (respuesta.status === "incomplete") {
    throw new Error(
      `El modelo cortó la respuesta antes de terminarla (${respuesta.incomplete_details?.reason ?? "sin motivo"}).`,
    );
  }

  const texto = respuesta.output_text.trim();
  if (texto === "") {
    throw new Error("El modelo devolvió una respuesta sin contenido de texto");
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`El modelo devolvió algo que no es JSON: ${texto.slice(0, 200)}`);
  }
}

export function crearProveedorOpenAI(opciones: OpcionesProveedorOpenAI = {}): ProveedorLlm {
  const llave = opciones.llave ?? process.env["OPENAI_API_KEY"];

  if (opciones.cliente === undefined && (llave === undefined || llave.trim() === "")) {
    throw new ConfiguracionInvalida(
      "LLM_MODO=openai necesita OPENAI_API_KEY. Para desarrollar sin consumir crédito, usá LLM_MODO=suscripcion.",
    );
  }

  const cliente = opciones.cliente ?? new OpenAI({ apiKey: llave });
  const modeloGuardia =
    opciones.modeloGuardia ?? process.env["MODELO_GUARDIA_OPENAI"] ?? MODELOS_OPENAI_POR_OMISION.guardia;
  const modeloRespuesta =
    opciones.modeloRespuesta ?? process.env["MODELO_RESPUESTA_OPENAI"] ?? MODELOS_OPENAI_POR_OMISION.respuesta;

  return {
    nombre: `openai:${modeloGuardia}+${modeloRespuesta}`,
    aptoParaDespliegue: true,

    async clasificar(peticion: PeticionDeClasificacion): Promise<Respondido<VeredictoCapa1>> {
      const inicio = Date.now();

      // Las señales de la capa 0 van como contexto en un bloque aparte, nunca
      // mezcladas con el mensaje del usuario.
      const contexto =
        peticion.sospechas.length === 0
          ? ""
          : `\n\nSeñales que detectó el filtro previo (son pistas, no veredictos): ` +
            peticion.sospechas.map((s) => s.clave).join(", ");

      const respuesta = await cliente.responses.create({
        model: modeloGuardia,
        instructions: PROMPT_DEL_CLASIFICADOR,
        input: [
          {
            role: "user",
            content: `<mensaje_a_clasificar>\n${peticion.mensaje}\n</mensaje_a_clasificar>${contexto}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "clasificacion",
            schema: ESQUEMA_DE_CLASIFICACION as unknown as Record<string, unknown>,
            strict: true,
          },
        },
        reasoning: { effort: "low" },
        // Incluye el razonamiento, que se cuenta adentro de este tope.
        max_output_tokens: 1_000,
        prompt_cache_key: "noticias-clasificador",
        store: false,
      });

      const costo = medirCostoOpenAI(modeloGuardia, respuesta.usage, Date.now() - inicio);

      const negativa = negativaDe(respuesta);
      if (negativa !== null) {
        return {
          valor: {
            categoria: "contenido_dañino",
            parteLegitima: null,
            tareaAjena: null,
            razonamiento: `El clasificador se negó a etiquetarlo: ${negativa.slice(0, 200)}`,
          },
          costo,
        };
      }

      return { valor: validarClasificacion(extraerJson(respuesta)), costo };
    },

    async responder(peticion: PeticionDeRespuesta): Promise<Respondido<RespuestaDelModelo>> {
      const inicio = Date.now();

      const respuesta = await cliente.responses.create({
        model: modeloRespuesta,
        instructions: PROMPT_DEL_SISTEMA,
        input: [
          ...peticion.historial.map((turno) => ({
            role: turno.rol === "usuario" ? ("user" as const) : ("assistant" as const),
            content: turno.contenido,
          })),
          {
            role: "user" as const,
            // El turno lo arma un solo lugar, que genera la marca aleatoria y
            // la usa en el bloque y en el recordatorio (prompt.ts).
            content: armarTurnoDeRespuesta(peticion),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "respuesta",
            schema: ESQUEMA_DE_RESPUESTA as unknown as Record<string, unknown>,
            strict: true,
          },
        },
        reasoning: { effort: "low" },
        max_output_tokens: 2_500,
        prompt_cache_key: "noticias-respuesta",
        store: false,
      });

      const costo = medirCostoOpenAI(modeloRespuesta, respuesta.usage, Date.now() - inicio);

      // Pasó el clasificador, así que una negativa acá es rara. Si pasa, se
      // dice: no se inventa una respuesta vacía que parezca del acervo.
      const negativa = negativaDe(respuesta);
      if (negativa !== null) {
        throw new Error(`El modelo se negó a responder: ${negativa.slice(0, 200)}`);
      }

      return { valor: validarRespuesta(extraerJson(respuesta)), costo };
    },
  };
}
