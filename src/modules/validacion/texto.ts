// ===========================================================================
// Comparación de títulos y extracción de palabras clave
//
// Dos cosas hacen falta y ninguna necesita un modelo:
//
//   · Comparar el titular que envió el publicador con el que trae la página
//     original, tolerando que no sean idénticos carácter por carácter.
//   · Sacar términos de búsqueda del titular para preguntarle a GDELT.
//
// El coeficiente que se usa para comparar es explicable en una línea, que es
// el requisito de fondo: un publicador al que le rechazan la nota tiene que
// poder entender por qué.
// ===========================================================================

/** Palabras que no distinguen una noticia de otra. */
export const VACIAS: ReadonlySet<string> = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "lo", "al", "del",
  "de", "a", "ante", "bajo", "con", "contra", "desde", "en", "entre", "hacia",
  "hasta", "para", "por", "segun", "sin", "sobre", "tras", "durante",
  "y", "e", "o", "u", "ni", "pero", "mas", "sino", "que", "como", "cuando",
  "donde", "porque", "pues", "si", "no", "se", "su", "sus", "le", "les",
  "es", "son", "fue", "fueron", "ser", "sera", "seran", "esta", "estan",
  "estaba", "estuvo", "ha", "han", "habia", "hay", "tiene", "tienen", "tuvo",
  "este", "esta", "esto", "estos", "estas", "ese", "esa", "eso", "esos", "esas",
  "aquel", "aquella", "otro", "otra", "otros", "otras", "todo", "toda",
  "todos", "todas", "mismo", "misma", "muy", "mucho", "mucha", "tambien",
  "solo", "ya", "aun", "asi", "mientras", "tanto", "cada", "vez", "dos",
  "tres", "sus", "nos", "me", "mi", "tu", "te", "yo", "el",
]);

/**
 * Minúsculas, sin acentos, sin puntuación, espacios colapsados.
 *
 * Quitar los acentos hace que «Peten» y «Petén» comparen igual, que es lo que
 * se quiere: la diferencia entre los dos titulares casi nunca está ahí.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras significativas: normalizadas, sin vacías, de 3 letras o más. */
export function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((t) => t.length >= 3 && !VACIAS.has(t));
}

/**
 * Parecido entre dos títulos, de 0 a 1, por coeficiente de Sørensen–Dice sobre
 * palabras significativas:
 *
 *     2 × (palabras en común) / (palabras de A + palabras de B)
 *
 * Se eligió sobre la distancia de edición porque mide lo que importa aquí —
 * cuánto del contenido coincide — y no cuántas letras hay que cambiar. Un
 * titular que reordena las mismas palabras es el mismo titular; uno que cambia
 * un nombre propio no lo es, aunque se parezca mucho letra por letra.
 */
export function similitudDeTitulos(a: string, b: string): number {
  const conjuntoA = new Set(tokens(a));
  const conjuntoB = new Set(tokens(b));

  if (conjuntoA.size === 0 || conjuntoB.size === 0) return 0;

  let comunes = 0;
  for (const t of conjuntoA) if (conjuntoB.has(t)) comunes++;

  return (2 * comunes) / (conjuntoA.size + conjuntoB.size);
}

/**
 * Términos de búsqueda sacados del titular, en orden de utilidad.
 *
 * Prioriza las palabras que en el original venían en mayúscula inicial y no
 * abren la oración: suelen ser nombres propios, y un nombre propio es lo que
 * hace que la búsqueda en GDELT traiga el mismo hecho y no cualquier noticia
 * del tema. A igualdad, la palabra más larga primero.
 */
export function palabrasClave(titulo: string, max = 6): string[] {
  const originales = titulo.split(/\s+/).filter((p) => p !== "");

  const puntuadas = new Map<string, number>();

  originales.forEach((palabra, indice) => {
    const limpia = normalizar(palabra);
    if (limpia.length < 3 || VACIAS.has(limpia)) return;

    const pareceNombrePropio = indice > 0 && /^\p{Lu}/u.test(palabra);
    const puntos = (pareceNombrePropio ? 100 : 0) + limpia.length;

    const previo = puntuadas.get(limpia) ?? 0;
    if (puntos > previo) puntuadas.set(limpia, puntos);
  });

  return [...puntuadas.entries()]
    .sort((x, y) => (y[1] - x[1]) || x[0].localeCompare(y[0]))
    .slice(0, max)
    .map(([palabra]) => palabra);
}

/** Qué fracción de las palabras del titular aparece en el cuerpo. */
export function respaldoEnElCuerpo(titulo: string, cuerpo: string): number {
  const delTitulo = new Set(tokens(titulo));
  if (delTitulo.size === 0) return 0;

  const delCuerpo = new Set(tokens(cuerpo));

  let presentes = 0;
  for (const t of delTitulo) if (delCuerpo.has(t)) presentes++;

  return presentes / delTitulo.size;
}
