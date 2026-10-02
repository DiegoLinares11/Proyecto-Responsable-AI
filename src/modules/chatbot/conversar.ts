// ===========================================================================
// Fase 4 — El orquestador de las cinco capas
//
// Todo el control de flujo de la defensa está aquí y en ningún otro lugar, para
// que se pueda leer completo de un tirón. Cada capa asume que la anterior falló.
//
//   Capa 0  filtro determinista + cupo            0 tokens
//   Capa 1  clasificador de intención             ~$0.0004
//   Capa 2  respuesta acotada                     ~$0.011
//   Capa 3  guardia de salida                     0 tokens
//   Capa 4  bitácora                              0 tokens
//
// El orden no es solo de seguridad, también de presupuesto: un mensaje fuera de
// dominio muere en Haiku por cuatro décimas de milésimo de dólar en vez de en
// Sonnet por once milésimos. En una corrida de red team con cien ataques, la
// diferencia se nota.
// ===========================================================================

import {
  NEGATIVA_CONTENIDO_DANINO,
  NEGATIVA_FUERA_DE_DOMINIO,
  NOTICIAS_EN_CONTEXTO,
  type CategoriaDeIntencion,
  type ContarMensajesDeHoy,
  type GuardarTurno,
  type NivelDeConfianza,
  type RecuperarNoticias,
  type ResultadoDeConversacion,
  type TurnoRegistrado,
  type VerificarNoticias,
} from "./tipos.ts";
import { filtrarEntrada, type OpcionesCapa0 } from "./capa0-filtro.ts";
import {
  revisarSalida,
  RESPUESTA_BLOQUEADA_POR_CONTENIDO_SOSPECHOSO,
  RESPUESTA_BLOQUEADA_POR_GUARDIA,
} from "./capa3-guardia.ts";
import { PROMPT_DEL_SISTEMA } from "./prompt.ts";
import {
  COSTO_CERO,
  sumarCostos,
  type ProveedorLlm,
  type TurnoDeHistorial,
} from "./proveedor/tipos.ts";

export type DependenciasDelChatbot = {
  proveedor: ProveedorLlm;
  recuperarNoticias: RecuperarNoticias;
  verificarNoticias: VerificarNoticias;
  guardarTurno: GuardarTurno;
  contarMensajesDeHoy: ContarMensajesDeHoy;
  capa0?: OpcionesCapa0;
  noticiasEnContexto?: number;
};

export type PeticionDeConversacion = {
  idUsuario: string;
  idConversacion: string;
  mensaje: string;
  historial?: readonly TurnoDeHistorial[];
};

/** Las categorías que no llegan al modelo grande, y con qué se les responde. */
const NEGATIVAS: Partial<Record<CategoriaDeIntencion, string>> = {
  fuera_de_dominio: NEGATIVA_FUERA_DE_DOMINIO,
  contenido_dañino: NEGATIVA_CONTENIDO_DANINO,
};

export async function conversar(
  peticion: PeticionDeConversacion,
  deps: DependenciasDelChatbot,
): Promise<ResultadoDeConversacion> {
  const limite = deps.noticiasEnContexto ?? NOTICIAS_EN_CONTEXTO;

  const terminar = async (
    parcial: Omit<TurnoRegistrado, "idConversacion" | "mensajeDelUsuario">,
  ): Promise<ResultadoDeConversacion> => {
    const registro: TurnoRegistrado = {
      idConversacion: peticion.idConversacion,
      mensajeDelUsuario: peticion.mensaje,
      ...parcial,
    };

    // La bitácora no puede tumbar la respuesta: si falla el registro, el usuario
    // igual recibe lo suyo y el fallo se ve en los logs del servidor. Lo
    // contrario —no contestar porque no se pudo auditar— convierte la auditoría
    // en un punto único de falla del producto.
    try {
      await deps.guardarTurno(registro);
    } catch (error) {
      console.error("No se pudo registrar el turno del chatbot:", error);
    }

    return {
      respuesta: registro.respuesta,
      bloqueado: registro.bloqueado,
      capaQueCorto: registro.capaQueCorto,
      noticiasCitadas: registro.noticiasCitadas,
      confianza: registro.confianza,
      costo: registro.costo,
      registro,
    };
  };

  // --- Capa 0 --------------------------------------------------------------
  const mensajesDeHoy = await deps.contarMensajesDeHoy(peticion.idUsuario);
  const capa0 = filtrarEntrada({ mensaje: peticion.mensaje, mensajesDeHoy }, deps.capa0);

  if (!capa0.permitido) {
    return terminar({
      respuesta: capa0.motivo,
      bloqueado: true,
      capaQueCorto: "capa0",
      motivoBloqueo: capa0.motivo,
      categoria: null,
      sospechas: capa0.sospechas,
      noticiasCitadas: [],
      confianza: null,
      costo: COSTO_CERO,
    });
  }

  // --- Capa 1 --------------------------------------------------------------
  const clasificacion = await deps.proveedor.clasificar({
    mensaje: peticion.mensaje,
    sospechas: capa0.sospechas,
  });

  const categoria = clasificacion.valor.categoria;
  const negativa = NEGATIVAS[categoria];

  if (negativa !== undefined) {
    return terminar({
      respuesta: negativa,
      bloqueado: true,
      capaQueCorto: "capa1",
      motivoBloqueo: `Clasificado como ${categoria}: ${clasificacion.valor.razonamiento}`,
      categoria,
      sospechas: capa0.sospechas,
      noticiasCitadas: [],
      confianza: null,
      costo: clasificacion.costo,
    });
  }

  // `intento_desvio` NO se bloquea: se atiende la parte legítima y se niega la
  // escondida. Un chatbot que niega todo el mensaje porque una parte era
  // indebida castiga al usuario por la forma de preguntar, y en la mayoría de
  // los casos el que pregunta así no está atacando nada.
  const esDesvio = categoria === "intento_desvio";
  const consulta = esDesvio ? (clasificacion.valor.parteLegitima ?? peticion.mensaje) : peticion.mensaje;

  // --- Capa 2 --------------------------------------------------------------
  const noticias = await deps.recuperarNoticias(consulta, limite);

  const respondido = await deps.proveedor.responder({
    mensaje: consulta,
    noticias,
    historial: peticion.historial ?? [],
    tareaAjenaANegar: esDesvio ? clasificacion.valor.tareaAjena : null,
  });

  const costo = sumarCostos(clasificacion.costo, respondido.costo);

  // --- Capa 3 --------------------------------------------------------------
  const capa3 = await revisarSalida(
    {
      respuesta: respondido.valor,
      noticiasOfrecidas: noticias,
      promptDelSistema: PROMPT_DEL_SISTEMA,
    },
    deps.verificarNoticias,
  );

  if (!capa3.permitido) {
    return terminar({
      respuesta: capa3.porInyeccionEnElContenido
        ? RESPUESTA_BLOQUEADA_POR_CONTENIDO_SOSPECHOSO
        : RESPUESTA_BLOQUEADA_POR_GUARDIA,
      bloqueado: true,
      capaQueCorto: "capa3",
      motivoBloqueo: capa3.motivo,
      categoria,
      sospechas: capa0.sospechas,
      noticiasCitadas: [],
      confianza: null,
      costo,
    });
  }

  return terminar({
    respuesta: respondido.valor.respuesta,
    bloqueado: false,
    capaQueCorto: null,
    motivoBloqueo: null,
    categoria,
    sospechas: capa0.sospechas,
    noticiasCitadas: respondido.valor.noticias_citadas,
    confianza: respondido.valor.confianza as NivelDeConfianza,
    costo,
  });
}
