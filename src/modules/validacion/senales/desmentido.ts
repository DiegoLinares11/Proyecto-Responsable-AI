// ===========================================================================
// Señal 4 — Desmentidos conocidos
//
// Se consulta un verificador de hechos con las palabras clave del titular. Si
// la afirmación ya fue calificada como falsa por una organización de
// fact-checking, la noticia se marca `desmentida` y se detiene ahí. Ninguna
// otra señal la rescata: es un veto, no un puntaje.
//
// Por qué veto y no resta: una nota que un verificador ya desmintió no se
// arregla teniendo buena fuente y buena redacción. Si se le restaran puntos,
// una noticia falsa publicada por un medio de credibilidad 90 y corroborada por
// tres agregadores podría seguir pasando el umbral. El orden correcto es que lo
// comprobado como falso no se publica.
// ===========================================================================

import {
  MAXIMOS,
  type BuscarDesmentidos,
  type Desmentido,
  type NoticiaAValidar,
  type ResultadoSenal,
} from "../tipos.ts";
import { normalizar, palabrasClave } from "../texto.ts";

const MAXIMO = MAXIMOS.desmentido;

/**
 * Calificaciones que significan «esto es falso».
 *
 * Se revisa primero si la calificación es afirmativa, porque «mayormente
 * verdadero» no debe caer aquí por contener una subcadena desafortunada.
 */
const AFIRMATIVAS = [
  "verdadero", "verdad", "cierto", "correcto", "confirmado", "preciso",
  "true", "accurate", "correct", "confirmed",
];

const NEGATIVAS = [
  "falso", "falsa", "incorrecto", "incorrecta", "enganoso", "enganosa",
  "inventado", "inventada", "bulo", "desinformacion", "distorsiona",
  "distorsionado", "alterado", "manipulado", "fabricado",
  "sin evidencia", "sin fundamento", "no hay evidencia",
  "false", "fake", "misleading", "unsupported", "no evidence",
  "fabricated", "altered", "manipulated", "pants on fire", "debunked",
];

export type ClaseDeCalificacion = "afirmativa" | "negativa" | "indeterminada";

export function clasificarCalificacion(calificacion: string): ClaseDeCalificacion {
  const texto = normalizar(calificacion);
  if (texto === "") return "indeterminada";

  if (AFIRMATIVAS.some((a) => texto.includes(a))) return "afirmativa";
  if (NEGATIVAS.some((n) => texto.includes(n))) return "negativa";
  return "indeterminada";
}

function resumir(d: Desmentido) {
  return {
    afirmacion: d.afirmacion,
    editor: d.editor,
    calificacion: d.calificacion,
    url: d.url,
  };
}

export async function evaluarDesmentido(
  noticia: NoticiaAValidar,
  buscarDesmentidos: BuscarDesmentidos,
  exigirVerificador: boolean,
): Promise<ResultadoSenal> {
  const base = { senal: "desmentido", maximo: MAXIMO, aporte: 0 } as const;

  if (buscarDesmentidos === null) {
    return {
      ...base,
      veto: false,
      // Si se exige el verificador y no está configurado, la señal cuenta como
      // indisponible y ninguna noticia llega sola a `verificada`.
      disponible: !exigirVerificador,
      detalle: {
        resultado: "verificador_no_configurado",
        se_exige: exigirVerificador,
        explicacion: exigirVerificador
          ? "No hay verificador de hechos configurado, así que no se pudo comprobar si la " +
            "afirmación ya fue desmentida. Mientras eso no se pueda comprobar, nada se publica solo."
          : "No hay verificador de hechos configurado, y está configurado NO exigirlo. Es una " +
            "decisión editorial: se acepta publicar sin haber comprobado desmentidos. Queda registrada aquí.",
      },
    };
  }

  const terminos = palabrasClave(noticia.titulo);
  const consulta = terminos.join(" ");

  let hallazgos: Desmentido[];
  try {
    hallazgos = await buscarDesmentidos(consulta);
  } catch (error) {
    return {
      ...base,
      veto: false,
      disponible: false,
      detalle: {
        resultado: "verificador_no_disponible",
        consulta,
        error: error instanceof Error ? error.message : String(error),
        explicacion:
          "El verificador de hechos no respondió. No se pudo comprobar si la afirmación fue " +
          "desmentida, así que la noticia pasa a revisión humana.",
      },
    };
  }

  const desmentidos = hallazgos.filter(
    (h) => clasificarCalificacion(h.calificacion) === "negativa",
  );

  if (desmentidos.length > 0) {
    return {
      ...base,
      veto: true,
      disponible: true,
      detalle: {
        resultado: "desmentida",
        consulta,
        desmentidos: desmentidos.map(resumir),
        explicacion:
          `${desmentidos.length === 1 ? "Una organización de verificación" : `${desmentidos.length} organizaciones de verificación`} ` +
          "ya calificó esta afirmación como falsa. Es un veto: ninguna otra señal la compensa.",
      },
    };
  }

  const dudosos = hallazgos.filter(
    (h) => clasificarCalificacion(h.calificacion) === "indeterminada",
  );

  return {
    ...base,
    veto: false,
    disponible: true,
    detalle: {
      resultado: hallazgos.length === 0 ? "sin_desmentidos" : "verificada_sin_desmentido",
      consulta,
      revisiones_encontradas: hallazgos.length,
      ...(dudosos.length > 0
        ? {
            calificaciones_sin_clasificar: dudosos.map(resumir),
            nota_para_el_moderador:
              "Hay verificaciones cuya calificación no se pudo clasificar automáticamente. " +
              "No vetan, pero conviene leerlas.",
          }
        : {}),
      explicacion:
        hallazgos.length === 0
          ? "Ninguna organización de verificación tiene registro de esta afirmación."
          : "Hay verificaciones sobre el tema, pero ninguna la califica como falsa.",
    },
  };
}
