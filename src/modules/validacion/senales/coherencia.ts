// ===========================================================================
// Señal 5 — Coherencia interna
//
// La única señal que no sale a internet: mira la noticia contra sí misma.
// Cuatro comprobaciones de cinco puntos cada una.
//
// Es la señal más barata y la que atrapa lo más tonto, que en la práctica es
// mucho: notas pegadas a medias, plantillas sin llenar, títulos que no tienen
// nada que ver con el cuerpo, y titulares GRITADOS con cinco signos de
// exclamación. Nada de eso prueba que una noticia sea falsa, pero todo eso
// predice que una persona debería mirarla antes de publicarla.
// ===========================================================================

import { MAXIMOS, type NoticiaAValidar, type ResultadoSenal } from "../tipos.ts";
import { respaldoEnElCuerpo } from "../texto.ts";
import { recortar, redondear } from "../numeros.ts";

const MAXIMO = MAXIMOS.coherencia;
const POR_COMPROBACION = MAXIMO / 4;

/** Qué fracción de las palabras del titular debe aparecer en el cuerpo. */
const RESPALDO_MINIMO = 0.4;

/** Una nota con fecha declarada más de esto en el futuro no es plausible. */
const MINUTOS_DE_TOLERANCIA_AL_FUTURO = 60;

/** Más viejo que esto y no es una noticia, es un archivo. */
const DIAS_MAXIMOS_DE_ANTIGUEDAD = 365 * 2;

const RESTOS_DE_PLANTILLA: ReadonlyArray<readonly [RegExp, string]> = [
  [/lorem ipsum/i, "texto de relleno «lorem ipsum»"],
  [/\[\s*(insertar|pegar|completar|titulo|texto)\b/i, "marcador de plantilla sin llenar"],
  [/\{\{[^}]*\}\}/, "variable de plantilla sin reemplazar"],
  [/\bTODO\s*:/, "una nota «TODO:» del redactor"],
  [/\bXXX+\b/, "marcador «XXX» sin reemplazar"],
  [/\b(como|as an?) (modelo de lenguaje|ai language model)\b/i, "texto dejado por un asistente de IA"],
  [/\bno puedo (ayudarte|asistirte) con\b/i, "una negativa de asistente de IA copiada al cuerpo"],
];

type Comprobacion = {
  nombre: string;
  paso: boolean;
  detalle: string;
};

function revisarFecha(declarada: Date | null, ahora: Date): Comprobacion {
  if (declarada === null) {
    return {
      nombre: "fecha_plausible",
      paso: true,
      detalle: "No se declaró fecha. No hay nada que contradiga, así que no se penaliza.",
    };
  }

  const minutosEnElFuturo = (declarada.getTime() - ahora.getTime()) / 60_000;
  if (minutosEnElFuturo > MINUTOS_DE_TOLERANCIA_AL_FUTURO) {
    return {
      nombre: "fecha_plausible",
      paso: false,
      detalle: `La fecha declarada (${declarada.toISOString()}) está en el futuro.`,
    };
  }

  const diasDeAntiguedad = (ahora.getTime() - declarada.getTime()) / 86_400_000;
  if (diasDeAntiguedad > DIAS_MAXIMOS_DE_ANTIGUEDAD) {
    return {
      nombre: "fecha_plausible",
      paso: false,
      detalle:
        `La fecha declarada tiene ${Math.round(diasDeAntiguedad)} días. Presentar material de archivo ` +
        "como noticia del día es una de las formas más comunes de desinformar sin mentir.",
    };
  }

  return {
    nombre: "fecha_plausible",
    paso: true,
    detalle: "La fecha declarada es plausible.",
  };
}

function revisarRespaldo(noticia: NoticiaAValidar): Comprobacion {
  const fraccion = respaldoEnElCuerpo(noticia.titulo, `${noticia.resumen} ${noticia.cuerpo}`);
  const paso = fraccion >= RESPALDO_MINIMO;

  return {
    nombre: "titulo_respaldado_por_el_cuerpo",
    paso,
    detalle: paso
      ? `El ${Math.round(fraccion * 100)}% de las palabras significativas del titular aparece en el texto.`
      : `Solo el ${Math.round(fraccion * 100)}% de las palabras del titular aparece en el texto ` +
        `(se espera al menos ${Math.round(RESPALDO_MINIMO * 100)}%). El titular promete algo que el cuerpo no cuenta.`,
  };
}

function revisarPlantilla(noticia: NoticiaAValidar): Comprobacion {
  const todo = `${noticia.titulo}\n${noticia.resumen}\n${noticia.cuerpo}`;
  const encontrados = RESTOS_DE_PLANTILLA.filter(([patron]) => patron.test(todo)).map(
    ([, descripcion]) => descripcion,
  );

  return {
    nombre: "sin_restos_de_plantilla",
    paso: encontrados.length === 0,
    detalle:
      encontrados.length === 0
        ? "No se encontraron marcadores de plantilla ni restos de redacción."
        : `Se encontró ${encontrados.join("; ")}.`,
  };
}

function revisarRegistro(noticia: NoticiaAValidar): Comprobacion {
  const problemas: string[] = [];

  const letras = [...noticia.titulo].filter((c) => /\p{L}/u.test(c));
  const mayusculas = letras.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase());
  if (letras.length >= 10 && mayusculas.length / letras.length > 0.6) {
    problemas.push("el titular está casi todo en mayúsculas");
  }

  if (/[!?]{3,}/.test(noticia.titulo) || (noticia.titulo.match(/!/g)?.length ?? 0) >= 3) {
    problemas.push("el titular acumula signos de exclamación");
  }

  return {
    nombre: "registro_sobrio",
    paso: problemas.length === 0,
    detalle:
      problemas.length === 0
        ? "El titular usa un registro informativo."
        : `${problemas.join(" y ")}. No prueba nada, pero es el registro de la nota sensacionalista.`,
  };
}

export function evaluarCoherencia(
  noticia: NoticiaAValidar,
  ahora: Date = new Date(),
): ResultadoSenal {
  const comprobaciones: Comprobacion[] = [
    revisarFecha(noticia.publicadaEn, ahora),
    revisarRespaldo(noticia),
    revisarPlantilla(noticia),
    revisarRegistro(noticia),
  ];

  const pasadas = comprobaciones.filter((c) => c.paso).length;
  const falladas = comprobaciones.filter((c) => !c.paso);

  return {
    senal: "coherencia",
    aporte: redondear(recortar(pasadas * POR_COMPROBACION, 0, MAXIMO)),
    maximo: MAXIMO,
    disponible: true,
    veto: false,
    detalle: {
      resultado: falladas.length === 0 ? "coherente" : "con_observaciones",
      comprobaciones_pasadas: pasadas,
      comprobaciones_totales: comprobaciones.length,
      comprobaciones: comprobaciones.map((c) => ({
        nombre: c.nombre,
        paso: c.paso,
        detalle: c.detalle,
      })),
      explicacion:
        falladas.length === 0
          ? "La noticia es coherente consigo misma en las cuatro comprobaciones."
          : `Falló ${falladas.length} de ${comprobaciones.length}: ${falladas.map((c) => c.nombre).join(", ")}.`,
    },
  };
}
