// ===========================================================================
// Las secciones editoriales
//
// Una sola lista. Hasta el 3 de octubre había cuatro copias —la portada, la
// nota completa, la cabecera y el formulario de publicar—, cada una con su
// orden y sus nombres, y la que filtraba la URL vivía junto a las consultas al
// servidor, donde un componente de cliente no la podía importar.
//
// Tiene que coincidir con el enum `seccion_noticia` de la base (migración
// 20261002140000). Una prueba lee la migración y lo comprueba: si alguien
// agrega una sección en un lado y no en el otro, falla antes de llegar a un
// INSERT que la base rechaza.
//
// La sección la elige quien publica. No la infiere ningún modelo: clasificar
// una nota es una decisión editorial (ADR 0002).
// ===========================================================================

export type SeccionDeNoticia =
  | "general"
  | "guatemala"
  | "mundo"
  | "politica"
  | "economia"
  | "deportes"
  | "cultura"
  | "tecnologia";

/** En el orden en que aparecen en la cabecera y en el formulario. */
export const SECCIONES: ReadonlyArray<{ clave: SeccionDeNoticia; nombre: string }> = [
  { clave: "general", nombre: "Última hora" },
  { clave: "guatemala", nombre: "Guatemala" },
  { clave: "mundo", nombre: "Mundo" },
  { clave: "politica", nombre: "Política" },
  { clave: "economia", nombre: "Economía" },
  { clave: "deportes", nombre: "Deportes" },
  { clave: "cultura", nombre: "Cultura" },
  { clave: "tecnologia", nombre: "Tecnología" },
];

export const NOMBRE_DE_SECCION: Readonly<Record<SeccionDeNoticia, string>> = Object.fromEntries(
  SECCIONES.map((s) => [s.clave, s.nombre]),
) as Record<SeccionDeNoticia, string>;

/**
 * Interpreta una sección que viene de afuera: la URL, un formulario.
 *
 * Es entrada de quien sea, así que lo desconocido devuelve null en vez de
 * llegar como texto a una consulta. PostgREST la escaparía igual, pero una
 * lista blanca no depende de que eso siga siendo cierto.
 */
export function interpretarSeccion(valor: unknown): SeccionDeNoticia | null {
  return typeof valor === "string" && SECCIONES.some((s) => s.clave === valor)
    ? (valor as SeccionDeNoticia)
    : null;
}
