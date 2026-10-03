// ===========================================================================
// Proveedor contra la API de Anthropic, con llave
//
// El modo que se usa para las mediciones que van al informe y para el
// despliegue. Es el único que devuelve consumo real de tokens, así que el costo
// por conversación de docs/presupuesto.md se mide aquí y no en el otro modo.
//
// Tres decisiones de implementación que valen explicación:
//
//   · **El prompt del sistema va en caché.** Es una constante (ver prompt.ts) y
//     se marca con `cache_control`, así que a partir del segundo turno se cobra
//     una fracción. Si los tokens leídos de caché salen en cero turno tras
//     turno, algo está invalidando el prefijo — casi siempre una fecha o un
//     identificador metido donde no va.
//
//   · **Salida estructurada, no texto libre.** `output_config.format` con
//     esquema JSON. Un modelo desviado no tiene campo donde meter el Java que le
//     pidieron.
//
//   · **Sin herramientas.** El modelo recibe las noticias ya recuperadas y no
//     tiene con qué buscar, ejecutar ni salir a la red. Es una propiedad más
//     fuerte que darle tres herramientas de solo lectura, y además cuesta una
//     sola llamada por turno en vez de un bucle de agente — que con presupuesto
//     de 20 dólares no es un detalle.
// ===========================================================================

import Anthropic from "@anthropic-ai/sdk";

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

export type OpcionesProveedorApi = {
  llave?: string | undefined;
  modeloGuardia?: string;
  modeloRespuesta?: string;
  cliente?: Anthropic;
};

function medirCosto(
  modelo: string,
  uso: Anthropic.Usage,
  latenciaMs: number,
): CostoDelTurno {
  const entrada = uso.input_tokens;
  const cache = (uso.cache_read_input_tokens ?? 0) + (uso.cache_creation_input_tokens ?? 0);
  const salida = uso.output_tokens;

  return {
    modelo,
    tokensEntrada: entrada,
    tokensSalida: salida,
    tokensCache: cache,
    costoUsd: calcularCosto(modelo, entrada, salida, cache),
    latenciaMs,
  };
}

/** Saca el JSON del bloque de texto. La respuesta viene con esquema, pero igual se valida. */
function extraerJson(mensaje: Anthropic.Message): unknown {
  const texto = mensaje.content
    .filter((bloque): bloque is Anthropic.TextBlock => bloque.type === "text")
    .map((bloque) => bloque.text)
    .join("")
    .trim();

  if (texto === "") {
    throw new Error("El modelo devolvió una respuesta sin contenido de texto");
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`El modelo devolvió algo que no es JSON: ${texto.slice(0, 200)}`);
  }
}

export function crearProveedorApi(opciones: OpcionesProveedorApi = {}): ProveedorLlm {
  const llave = opciones.llave ?? process.env["ANTHROPIC_API_KEY"];

  if (opciones.cliente === undefined && (llave === undefined || llave.trim() === "")) {
    throw new ConfiguracionInvalida(
      "LLM_MODO=api necesita ANTHROPIC_API_KEY. Para desarrollar sin consumir crédito, usá LLM_MODO=suscripcion.",
    );
  }

  const cliente = opciones.cliente ?? new Anthropic({ apiKey: llave });
  const modeloGuardia = opciones.modeloGuardia ?? process.env["MODELO_GUARDIA"] ?? "claude-haiku-4-5";
  const modeloRespuesta =
    opciones.modeloRespuesta ?? process.env["MODELO_RESPUESTA"] ?? "claude-sonnet-5";

  return {
    nombre: `api:${modeloGuardia}+${modeloRespuesta}`,
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

      const mensaje = await cliente.messages.create({
        model: modeloGuardia,
        max_tokens: 512,
        system: [
          {
            type: "text",
            text: PROMPT_DEL_CLASIFICADOR,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `<mensaje_a_clasificar>\n${peticion.mensaje}\n</mensaje_a_clasificar>${contexto}`,
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: ESQUEMA_DE_CLASIFICACION },
        },
      });

      return {
        valor: validarClasificacion(extraerJson(mensaje)),
        costo: medirCosto(modeloGuardia, mensaje.usage, Date.now() - inicio),
      };
    },

    async responder(peticion: PeticionDeRespuesta): Promise<Respondido<RespuestaDelModelo>> {
      const inicio = Date.now();

      const mensaje = await cliente.messages.create({
        model: modeloRespuesta,
        max_tokens: 1_500,
        system: [
          {
            type: "text",
            text: PROMPT_DEL_SISTEMA,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          ...peticion.historial.map((turno) => ({
            role: turno.rol === "usuario" ? ("user" as const) : ("assistant" as const),
            content: turno.contenido,
          })),
          {
            role: "user",
            // El turno lo arma un solo lugar, que genera la marca aleatoria y
            // la usa en el bloque y en el recordatorio (prompt.ts).
            content: armarTurnoDeRespuesta(peticion),
          },
        ],
        // Sin pensamiento extendido: esto es un resumen anclado a los datos que
        // ya se le dieron, no un problema que haya que razonar. Si el red team de
        // la Fase 5 muestra que el modelo se desvía, aquí es donde se sube.
        thinking: { type: "disabled" },
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: ESQUEMA_DE_RESPUESTA },
        },
      });

      return {
        valor: validarRespuesta(extraerJson(mensaje)),
        costo: medirCosto(modeloRespuesta, mensaje.usage, Date.now() - inicio),
      };
    },
  };
}
