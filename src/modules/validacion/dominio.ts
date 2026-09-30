// ===========================================================================
// Extracción y normalización de dominios
//
// El registro `fuentes` guarda dominios base (`prensalibre.com`), pero las
// noticias llegan con URLs completas y a veces con subdominio
// (`noticias.prensalibre.com`). Hace falta poder preguntar por varios
// candidatos, del más específico al más general.
// ===========================================================================

/**
 * Sufijos de dos etiquetas donde el dominio registrable tiene tres.
 *
 * No es la lista pública completa de sufijos — eso sería una dependencia y un
 * archivo de miles de líneas que habría que mantener. Es la lista de lo que
 * este proyecto realmente ve, con Guatemala primero. Si aparece un sufijo que
 * no está, el efecto es que se generan candidatos de más, y un candidato de
 * más simplemente no encuentra nada en el registro.
 */
const SUFIJOS_COMPUESTOS: ReadonlySet<string> = new Set([
  "com.gt", "edu.gt", "gob.gt", "org.gt", "net.gt",
  "com.mx", "com.ar", "com.br", "com.co", "com.pe", "com.sv", "com.hn", "com.ni",
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.es", "com.au", "co.jp", "com.tr",
]);

/**
 * Saca el nombre de host de una URL, en minúsculas y sin `www.`.
 * Devuelve null si la URL no se puede interpretar.
 */
export function extraerDominio(url: string): string | null {
  let host: string;
  try {
    host = new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (host === "") return null;

  // Una IP no es una fuente periodística identificable.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (host.includes(":")) return null; // IPv6

  if (host.startsWith("www.")) host = host.slice(4);

  return host.includes(".") ? host : null;
}

/**
 * Candidatos a buscar en el registro, del más específico al más general.
 *
 *   noticias.prensalibre.com -> ["noticias.prensalibre.com", "prensalibre.com"]
 *   algo.lahora.gt           -> ["algo.lahora.gt", "lahora.gt"]
 *   x.dca.com.gt             -> ["x.dca.com.gt", "dca.com.gt"]
 *
 * Nunca produce un sufijo suelto: `gt` o `com.gt` no son fuentes.
 */
export function candidatosDeDominio(dominio: string): string[] {
  const etiquetas = dominio.split(".").filter((e) => e !== "");
  if (etiquetas.length < 2) return [];

  const ultimasDos = etiquetas.slice(-2).join(".");
  const minimo = SUFIJOS_COMPUESTOS.has(ultimasDos) ? 3 : 2;

  if (etiquetas.length < minimo) return [];

  const candidatos: string[] = [];
  for (let desde = 0; etiquetas.length - desde >= minimo; desde++) {
    candidatos.push(etiquetas.slice(desde).join("."));
  }
  return candidatos;
}

/** Atajo: de una URL a sus candidatos de dominio. */
export function candidatosDeUrl(url: string): string[] {
  const dominio = extraerDominio(url);
  return dominio === null ? [] : candidatosDeDominio(dominio);
}

/** El dominio base, que es el último candidato. Para comparar independencia. */
export function dominioBase(url: string): string | null {
  const candidatos = candidatosDeUrl(url);
  return candidatos.at(-1) ?? null;
}
