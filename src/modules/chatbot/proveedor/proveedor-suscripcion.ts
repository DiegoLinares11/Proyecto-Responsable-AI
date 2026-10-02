// ===========================================================================
// Proveedor contra la suscripción local (Claude Agent SDK)
//
// Para desarrollar sin consumir crédito. Es el modo con el que se itera el día a
// día de la Fase 4; el crédito de API se reserva para las mediciones que van al
// informe y para el despliegue (ADR 0005).
//
// **Este modo no vale para producción, y el código lo impide.** Una aplicación
// desplegada que atiende usuarios necesita crédito de API: no es un detalle
// técnico, es una condición de uso, y respetarla es parte del trabajo en un
// curso de IA responsable.
//
// Dos diferencias con el modo `api` que hay que tener presentes, porque son la
// razón por la que el ADR exige que toda evaluación formal corra en `api`:
//
//   1. **No hay salida estructurada.** El Agent SDK no expone
//      `output_config.format`, así que el esquema se pide en el prompt y se
//      valida al parsear. El modelo puede devolver algo que no cumpla, y aquí eso
//      se detecta en vez de estar garantizado por el servidor.
//
//   2. **El costo que reporta es una estimación.** `total_cost_usd` del SDK es
//      un estimado del arnés, no una facturación. Los números del informe salen
//      del modo `api`, que devuelve el consumo real de tokens.
//
// Además el Agent SDK trae el arnés de Claude Code con sus herramientas
// integradas —leer archivos, ejecutar comandos, buscar en la web—. Todas se
// apagan: un chatbot de noticias con acceso al sistema de archivos sería un
// agujero mucho peor que cualquiera de los que este proyecto está defendiendo.
// ===========================================================================

import {
  ESQUEMA_DE_CLASIFICACION,
  ESQUEMA_DE_RESPUESTA,
  PROMPT_DEL_CLASIFICADOR,
  PROMPT_DEL_SISTEMA,
  delimitarAcervo,
  marcaDeAcervo,
  recordatorioDeTurno,
} from "../prompt.ts";
import type { CostoDelTurno, RespuestaDelModelo, VeredictoCapa1 } from "../tipos.ts";
import {
  type PeticionDeClasificacion,
  type PeticionDeRespuesta,
  type ProveedorLlm,
  type Respondido,
} from "./tipos.ts";
import { validarClasificacion, validarRespuesta } from "./validacion.ts";

export type OpcionesProveedorSuscripcion = {
  /** Para pruebas: reemplaza la llamada al SDK. */
  consultar?: ConsultarConSdk;
};

export type ResultadoDeConsulta = {
  texto: string;
  costoUsd: number;
  latenciaMs: number;
  tokensEntrada: number;
  tokensSalida: number;
};

export type ConsultarConSdk = (
  instrucciones: string,
  mensaje: string,
) => Promise<ResultadoDeConsulta>;

function pedirJson(esquema: unknown): string {
  return (
    "\n\nRespondé ÚNICAMENTE con un objeto JSON que cumpla este esquema, sin texto " +
    "antes ni después y sin cercarlo en un bloque de código:\n" +
    JSON.stringify(esquema)
  );
}

/** Quita el cercado de bloque de código si el modelo lo agregó de todas formas. */
function limpiarJson(texto: string): string {
  return texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parsear(texto: string): unknown {
  try {
    return JSON.parse(limpiarJson(texto));
  } catch {
    throw new Error(
      `El modo suscripción devolvió algo que no es JSON: ${texto.slice(0, 200)}. ` +
        "Sin salida estructurada del servidor esto puede pasar; es una de las razones por las " +
        "que las mediciones formales corren en modo api.",
    );
  }
}

/**
 * La llamada real al Agent SDK.
 *
 * El import es dinámico a propósito: así el paquete puede quedarse como
 * dependencia de desarrollo y un despliegue que corre en modo `api` no necesita
 * tenerlo instalado.
 */
const consultarConAgentSdk: ConsultarConSdk = async (instrucciones, mensaje) => {
  const inicio = Date.now();
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const corrida = query({
    prompt: mensaje,
    options: {
      systemPrompt: { type: "custom", prompt: instrucciones },
      // Se apaga el arnés completo. Este chatbot no lee archivos, no ejecuta
      // nada y no sale a la red.
      allowedTools: [],
      maxTurns: 1,
      settingSources: [],
    },
  });

  let texto = "";
  let costoUsd = 0;
  let tokensEntrada = 0;
  let tokensSalida = 0;

  for await (const evento of corrida) {
    if (evento.type !== "result") continue;

    if (evento.subtype !== "success") {
      throw new Error(`El Agent SDK terminó en ${evento.subtype}`);
    }

    texto = evento.result;
    costoUsd = evento.total_cost_usd;
    tokensEntrada = evento.usage.input_tokens ?? 0;
    tokensSalida = evento.usage.output_tokens ?? 0;
  }

  if (texto === "") {
    throw new Error("El Agent SDK no devolvió ningún resultado");
  }

  return { texto, costoUsd, tokensEntrada, tokensSalida, latenciaMs: Date.now() - inicio };
};

function medir(resultado: ResultadoDeConsulta): CostoDelTurno {
  return {
    modelo: "suscripcion",
    tokensEntrada: resultado.tokensEntrada,
    tokensSalida: resultado.tokensSalida,
    tokensCache: 0,
    // Estimado del arnés, no facturación. Los números del informe salen del
    // modo api.
    costoUsd: resultado.costoUsd,
    latenciaMs: resultado.latenciaMs,
  };
}

export function crearProveedorSuscripcion(
  opciones: OpcionesProveedorSuscripcion = {},
): ProveedorLlm {
  const consultar = opciones.consultar ?? consultarConAgentSdk;

  return {
    nombre: "suscripcion:agent-sdk",
    aptoParaDespliegue: false,

    async clasificar(peticion: PeticionDeClasificacion): Promise<Respondido<VeredictoCapa1>> {
      const contexto =
        peticion.sospechas.length === 0
          ? ""
          : `\n\nSeñales del filtro previo (pistas, no veredictos): ` +
            peticion.sospechas.map((s) => s.clave).join(", ");

      const resultado = await consultar(
        PROMPT_DEL_CLASIFICADOR + pedirJson(ESQUEMA_DE_CLASIFICACION),
        `<mensaje_a_clasificar>\n${peticion.mensaje}\n</mensaje_a_clasificar>${contexto}`,
      );

      return { valor: validarClasificacion(parsear(resultado.texto)), costo: medir(resultado) };
    },

    async responder(peticion: PeticionDeRespuesta): Promise<Respondido<RespuestaDelModelo>> {
      // Una marca distinta por consulta: quien escribió el cuerpo de una noticia
      // no la conoce, así que no puede cerrar el bloque ni abrir uno falso.
      const marca = marcaDeAcervo();
      const negativa =
        peticion.tareaAjenaANegar === null
          ? ""
          : `\n\n<nota_para_el_asistente>El mensaje original también pedía: ` +
            `"${peticion.tareaAjenaANegar}". Eso está fuera de lo que hacés. Respondé la ` +
            `consulta de noticias y decí en una frase que lo otro no lo hacés.</nota_para_el_asistente>`;

      const historial = peticion.historial
        .map((t) => `${t.rol === "usuario" ? "Usuario" : "Asistente"}: ${t.contenido}`)
        .join("\n");

      const resultado = await consultar(
        PROMPT_DEL_SISTEMA + pedirJson(ESQUEMA_DE_RESPUESTA),
        (historial === "" ? "" : `<conversacion_previa>\n${historial}\n</conversacion_previa>\n\n`) +
          `${delimitarAcervo(peticion.noticias)}\n\n` +
          `<pregunta>\n${peticion.mensaje}\n</pregunta>${negativa}\n\n` +
          recordatorioDeTurno(marca),
      );

      return { valor: validarRespuesta(parsear(resultado.texto)), costo: medir(resultado) };
    },
  };
}
