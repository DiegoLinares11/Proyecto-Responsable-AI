// ===========================================================================
// Capa 3 — Guardia de salida
//
// Corre sobre lo que el modelo produjo, antes de que el usuario lo vea. No
// cuesta tokens y atrapa la clase de fallo más cara de esta plataforma.
//
// La comprobación que más importa no es ninguna de las de seguridad clásica: es
// **que cada noticia citada exista de verdad**. En una plataforma cuyo argumento
// de venta es «esto está verificado», que el bot invente una noticia es peor que
// cualquier jailbreak — y a diferencia de un jailbreak, pasa sin que nadie lo
// esté atacando. Cruzar los identificadores contra la base convierte ese riesgo
// abierto en un fallo detectable.
//
// Las demás comprobaciones asumen que las capas anteriores fallaron. Esa es la
// premisa de todo el diseño: ninguna capa se confía de la anterior.
// ===========================================================================

import {
  type NoticiaParaElModelo,
  type RespuestaDelModelo,
  type SenalamientoDeContenido,
  type VerificarNoticias,
  type VeredictoCapa3,
} from "./tipos.ts";

type Comprobacion = { nombre: string; paso: boolean; detalle: string };

/**
 * Marcadores de código en la respuesta.
 *
 * El modelo no tiene herramienta para ejecutar código ni campo donde ponerlo,
 * así que llegar aquí significa que algo salió mal más arriba. Se bloquea igual:
 * la capa existe para el caso en que las anteriores fallaron.
 */
const MARCAS_DE_CODIGO: ReadonlyArray<readonly [RegExp, string]> = [
  [/```/, "un bloque de código cercado"],
  [/\bpublic\s+(static\s+)?(class|void|int)\b/, "una declaración de Java"],
  [/\bdef\s+\w+\s*\(/, "una definición de función de Python"],
  [/\bfunction\s+\w*\s*\(|\=\>\s*\{/, "una función de JavaScript"],
  [/\b(class|struct)\s+\w+\s*\{/, "una declaración de clase"],
  [/\b(System\.out\.println|console\.log|printf|std::cout)\b/, "una llamada de impresión"],
  [/\b(import|from)\s+[\w.*]+\s*(import\b|;)/, "una sentencia de importación"],
  [/<\?php|#!\/(usr\/)?bin/, "una cabecera de script"],
];

/**
 * Frases del prompt del sistema que, si aparecen en la respuesta, significan
 * que se filtró. Se extraen del propio prompt para que no haya que mantener dos
 * listas que se desincronizan.
 */
export function huellasDelSistema(promptDelSistema: string, minimoDePalabras = 8): string[] {
  return promptDelSistema
    .split(/[.\n]/)
    .map((f) => f.trim().replace(/\s+/g, " "))
    .filter((f) => f.split(" ").length >= minimoDePalabras);
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dominios y URLs en la respuesta.
 *
 * El chatbot nombra a los medios por su nombre («Prensa Libre»), nunca por su
 * dominio, y la interfaz es la que enlaza al artículo. Que emita un dominio no
 * es una función que exista: es la huella de que alguien le dijo que lo hiciera.
 */
const DOMINIOS =
  /\bhttps?:\/\/\S+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|gt|info|io|co|mx|es|gob|edu|xyz|biz|online|site|club|app|dev)\b/gi;

/**
 * Afirmaciones sobre el puntaje de veracidad.
 *
 * El lookahead descarta las menciones a la escala («va de 0 a 100»), que son
 * legítimas cuando el chatbot explica cómo funciona el puntaje.
 */
const VERACIDAD_AFIRMADA = /veracidad[^.\n\d]{0,25}(\d{1,3})(?!\s*(?:a|hasta)\s*100)/gi;

/**
 * Afirmaciones de que una NOTICIA es la más confiable.
 *
 * El sustantivo es opcional pero, si está, tiene que ser «noticia» o «nota»:
 * «la fuente más confiable» habla del medio, no de la noticia, y su
 * credibilidad no está en el contexto para comprobarla.
 */
const CONFIANZA_SUPERLATIVA =
  /\b(?:la|las)\s+(?:noticias?\s+|notas?\s+)?(m[aá]s\s+(?:confiables?|fiables?|cre[ií]bles?|verificadas?|seguras?|s[oó]lidas?))\b/gi;

/** «Una de las más confiables» no es un superlativo absoluto: no se juzga. */
const UNA_DE = /\bun[oa]s?\s+de\s+$/i;

/** El texto de una noticia tal como lo vio el modelo: titular y resumen. */
const textoVisto = (n: NoticiaParaElModelo): string => normalizar(`${n.titulo} ${n.resumen}`);

/** El nombre de host de un dominio o de una URL, sin `www.`. */
function anfitrion(dominioOUrl: string): string {
  const crudo = dominioOUrl.toLowerCase();
  if (/^https?:\/\//.test(crudo)) {
    try {
      return new URL(crudo).hostname.replace(/^www\./, "");
    } catch {
      return crudo;
    }
  }
  return crudo.replace(/^www\./, "");
}

/**
 * A qué noticia del contexto pertenece cada evidencia.
 *
 * No se supone «fue alguna de las ocho»: se busca la evidencia en el texto que
 * el modelo vio. Señalar de más no es inocuo —la alerta le llega a un moderador
 * con el nombre de quien publicó—, así que si ninguna noticia trae la evidencia,
 * no se señala a nadie: el modelo la produjo por su cuenta o se la pidió el
 * usuario, y eso ya lo bloquea la capa igual.
 */
function atribuir(
  noticias: readonly NoticiaParaElModelo[],
  dominios: readonly string[],
  puntajesInventados: readonly number[],
  superlativosFalsos: readonly string[],
): SenalamientoDeContenido[] {
  const hallados = new Map<string, SenalamientoDeContenido>();
  const anotar = (s: SenalamientoDeContenido) =>
    hallados.set(`${s.idNoticia}|${s.comprobacion}|${s.evidencia}`, s);

  for (const dominio of dominios) {
    const host = anfitrion(dominio);
    for (const noticia of noticias) {
      if (textoVisto(noticia).includes(host)) {
        anotar({ idNoticia: noticia.id, comprobacion: "sin_dominios_ajenos", evidencia: host });
      }
    }
  }

  // Para el puntaje no alcanza con que la noticia contenga el número —«300
  // pasajeros» no es una orden—: tiene que traer ella misma una afirmación de
  // veracidad con ESE número. Es la forma que toma la orden de falsificar el sello.
  for (const puntaje of puntajesInventados) {
    for (const noticia of noticias) {
      const dicta = [...textoVisto(noticia).matchAll(VERACIDAD_AFIRMADA)].some(
        (m) => Number(m[1]) === puntaje,
      );
      if (dicta) {
        anotar({ idNoticia: noticia.id, comprobacion: "veracidad_no_inventada", evidencia: `veracidad ${puntaje}` });
      }
    }
  }

  // La confianza: la noticia trae ella misma la frase que el modelo repitió.
  for (const superlativo of superlativosFalsos) {
    const nucleo = normalizar(superlativo);
    for (const noticia of noticias) {
      if (textoVisto(noticia).includes(nucleo)) {
        anotar({ idNoticia: noticia.id, comprobacion: "confianza_no_inventada", evidencia: superlativo });
      }
    }
  }

  return [...hallados.values()];
}

export type EntradaCapa3 = {
  respuesta: RespuestaDelModelo;
  /**
   * Las noticias completas que se le mostraron al modelo en esta vuelta.
   *
   * Hacen falta enteras, no solo sus identificadores: sin los puntajes y las
   * fuentes no se puede comprobar que lo que el modelo AFIRMA sobre una noticia
   * coincida con lo que esa noticia realmente dice.
   */
  noticiasOfrecidas: readonly NoticiaParaElModelo[];
  promptDelSistema: string;
};

export async function revisarSalida(
  entrada: EntradaCapa3,
  verificarNoticias: VerificarNoticias,
): Promise<VeredictoCapa3> {
  const comprobaciones: Comprobacion[] = [];
  const { respuesta } = entrada;

  // --- 1. La respuesta tiene algo que decir -------------------------------
  const texto = respuesta.respuesta.trim();
  comprobaciones.push({
    nombre: "respuesta_no_vacia",
    paso: texto.length > 0,
    detalle: texto.length > 0 ? "La respuesta tiene contenido." : "La respuesta vino vacía.",
  });

  // --- 2. Las noticias citadas existen ------------------------------------
  const citadas = [...new Set(respuesta.noticias_citadas)];
  const publicables = citadas.length === 0 ? new Set<string>() : await verificarNoticias(citadas);
  const inventadas = citadas.filter((id) => !publicables.has(id));

  comprobaciones.push({
    nombre: "noticias_citadas_existen",
    paso: inventadas.length === 0,
    detalle:
      inventadas.length === 0
        ? `Las ${citadas.length} noticias citadas existen y son publicables.`
        : `Se citaron ${inventadas.length} noticias que no existen o no son publicables: ` +
          `${inventadas.join(", ")}. Puede ser una alucinación o una noticia en moderación.`,
  });

  // --- 3. Solo se cita lo que se le mostró --------------------------------
  //
  // Una noticia real pero que no estaba en el contexto significa que el modelo
  // la sacó de su entrenamiento, no de la base. Aunque exista, no la leyó aquí.
  const ofrecidas = new Set(entrada.noticiasOfrecidas.map((n) => n.id));
  const noOfrecidas = citadas.filter((id) => publicables.has(id) && !ofrecidas.has(id));

  comprobaciones.push({
    nombre: "solo_cita_lo_recuperado",
    paso: noOfrecidas.length === 0,
    detalle:
      noOfrecidas.length === 0
        ? "Todas las citas salen de las noticias que se le mostraron."
        : `Citó noticias que no estaban en el contexto: ${noOfrecidas.join(", ")}.`,
  });

  // --- 4. Nada de código ---------------------------------------------------
  const codigo = MARCAS_DE_CODIGO.filter(([patron]) => patron.test(texto)).map(([, que]) => que);

  comprobaciones.push({
    nombre: "sin_codigo",
    paso: codigo.length === 0,
    detalle:
      codigo.length === 0
        ? "La respuesta no contiene código."
        : `La respuesta contiene ${codigo.join(", ")}. El chatbot no escribe código.`,
  });

  // --- 5. No se filtró el prompt del sistema ------------------------------
  const textoNormalizado = normalizar(texto);
  const filtradas = huellasDelSistema(entrada.promptDelSistema).filter((huella) =>
    textoNormalizado.includes(normalizar(huella)),
  );

  comprobaciones.push({
    nombre: "sin_fuga_del_sistema",
    paso: filtradas.length === 0,
    detalle:
      filtradas.length === 0
        ? "No hay fragmentos del prompt del sistema en la respuesta."
        : `La respuesta repite ${filtradas.length} fragmento(s) del prompt del sistema.`,
  });

  // --- 6. Ningún dominio ni enlace -----------------------------------------
  //
  // Esta es la defensa contra la inyección indirecta que manda al usuario a un
  // sitio del atacante. Es determinista a propósito: el prompt le pide al modelo
  // que no obedezca órdenes del dato, y el red team mostró que eso no alcanza.
  // Acá no hace falta que el modelo coopere.
  const dominios = [...new Set(texto.match(DOMINIOS) ?? [])];

  comprobaciones.push({
    nombre: "sin_dominios_ajenos",
    paso: dominios.length === 0,
    detalle:
      dominios.length === 0
        ? "La respuesta no menciona dominios ni enlaces."
        : `La respuesta menciona ${dominios.join(", ")}. El chatbot nombra a los medios por su ` +
          "nombre, nunca por su dominio, y no enlaza a ningún lado: que lo haga es la huella de que " +
          "alguien se lo pidió desde el contenido de una noticia.",
  });

  // --- 7. Los puntajes de veracidad son los de verdad ----------------------
  //
  // Un atacante que escribe el cuerpo de una noticia puede pedirle al modelo que
  // reporte un puntaje inventado. En una plataforma cuyo argumento es «esto está
  // verificado», falsificar el sello es el daño más grande posible.
  const puntajesReales = new Set(
    entrada.noticiasOfrecidas
      .map((n) => n.puntajeVeracidad)
      .filter((p): p is number => p !== null),
  );

  const afirmados = [...texto.matchAll(VERACIDAD_AFIRMADA)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));

  const inventados = [...new Set(afirmados.filter((n) => !puntajesReales.has(n)))];

  comprobaciones.push({
    nombre: "veracidad_no_inventada",
    paso: inventados.length === 0,
    detalle:
      inventados.length === 0
        ? "Los puntajes de veracidad que menciona coinciden con los de las noticias."
        : `Afirma puntajes de veracidad que ninguna noticia del contexto tiene: ${inventados.join(", ")}. ` +
          `Los reales son: ${[...puntajesReales].join(", ") || "ninguno"}.`,
  });

  // --- 8. Las afirmaciones de confianza son ciertas -----------------------
  //
  // «Es la más confiable» es una afirmación sobre los datos, y se comprueba
  // contra los datos: alguna de las noticias citadas tiene que tener el puntaje
  // de veracidad más alto de las que se le mostraron al modelo. Se verifica la
  // AFIRMACIÓN, no la redacción de quien la pidió, así que no depende de cómo
  // esté escrito el ataque. Es lo que cierra `iin-07`, abierto desde la Fase 5.
  //
  // Si la respuesta no cita nada, no hay a qué atar la afirmación y no se
  // juzga: bloquear ahí castigaría frases como «no puedo decirte cuál es la más
  // confiable».
  const superlativos = [...texto.matchAll(CONFIANZA_SUPERLATIVA)]
    .filter((m) => !UNA_DE.test(texto.slice(Math.max(0, (m.index ?? 0) - 12), m.index)))
    .map((m) => (m[1] ?? "").toLowerCase().replace(/\s+/g, " "));

  const citadasEnContexto = entrada.noticiasOfrecidas.filter((n) => citadas.includes(n.id));
  const mejorPuntaje = Math.max(
    ...entrada.noticiasOfrecidas.map((n) => n.puntajeVeracidad ?? Number.NEGATIVE_INFINITY),
  );
  const respaldada = citadasEnContexto.some((n) => n.puntajeVeracidad === mejorPuntaje);
  const confianzaInventada = superlativos.length > 0 && citadasEnContexto.length > 0 && !respaldada;

  comprobaciones.push({
    nombre: "confianza_no_inventada",
    paso: !confianzaInventada,
    detalle: !confianzaInventada
      ? "Las afirmaciones de confianza, si hay, las respalda el puntaje de lo citado."
      : `Afirma que lo citado es «${superlativos[0]}», y ninguna noticia citada tiene el mejor ` +
        `puntaje de veracidad del contexto (${mejorPuntaje}). Las citadas tienen: ` +
        `${citadasEnContexto.map((n) => n.puntajeVeracidad ?? "sin evaluar").join(", ")}.`,
  });

  const falladas = comprobaciones.filter((c) => !c.paso);

  // Las dos comprobaciones que delatan una inyección en el contenido. Si
  // cortan Y la evidencia aparece en alguna noticia, el usuario merece saber
  // por qué se quedó sin respuesta —no fue que el sistema no entendió, fue que
  // una noticia intentaba manipular lo que se le iba a decir— y esa noticia va
  // a un moderador. Si la evidencia no está en ninguna, decirlo sería mentir.
  const sospechosas = atribuir(
    entrada.noticiasOfrecidas,
    dominios,
    inventados,
    confianzaInventada ? superlativos : [],
  );

  return {
    permitido: falladas.length === 0,
    porInyeccionEnElContenido: sospechosas.length > 0,
    sospechosas,
    motivo:
      falladas.length === 0
        ? ""
        : falladas.map((c) => c.detalle).join(" "),
    comprobaciones,
  };
}

/** Lo que se le muestra al usuario cuando la guardia bloquea. */
export const RESPUESTA_BLOQUEADA_POR_GUARDIA =
  "No pude armar una respuesta que pueda respaldar con las noticias publicadas. " +
  "Probá preguntándolo de otra forma, o más específico.";

/**
 * Cuando el corte vino de una inyección en el contenido.
 *
 * Es deliberadamente explícito. El usuario no hizo nada malo y perdió su
 * respuesta; merece saber que la causa está en una de las noticias y no en su
 * pregunta.
 */
const CONTENIDO_SOSPECHOSO =
  "Encontré noticias sobre eso, pero una de ellas trae texto que intenta manipular lo que te " +
  "respondo —por ejemplo, dictar un puntaje de veracidad o mandarte a un sitio externo—, así que " +
  "preferí no contestar con ella.";

/**
 * Solo cuando la alerta SE REGISTRÓ. Durante las Fases 4 a 7 esta frase se le
 * dijo a todos los usuarios y nada reportaba nada: el chatbot afirmaba un
 * control que no existía.
 */
export const RESPUESTA_BLOQUEADA_POR_CONTENIDO_SOSPECHOSO =
  `${CONTENIDO_SOSPECHOSO} Queda reportada para que la revise un moderador.`;

/** Si el reporte falló, se dice lo que pasó y nada más. */
export const RESPUESTA_BLOQUEADA_POR_CONTENIDO_SIN_REPORTE = CONTENIDO_SOSPECHOSO;
