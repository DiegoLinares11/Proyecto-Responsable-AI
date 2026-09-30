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
  type RespuestaDelModelo,
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

export type EntradaCapa3 = {
  respuesta: RespuestaDelModelo;
  /** Los identificadores que se le mostraron al modelo en esta vuelta. */
  noticiasOfrecidas: readonly string[];
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
  const ofrecidas = new Set(entrada.noticiasOfrecidas);
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

  const falladas = comprobaciones.filter((c) => !c.paso);

  return {
    permitido: falladas.length === 0,
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
