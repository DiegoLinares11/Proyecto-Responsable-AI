// ===========================================================================
// Imágenes con licencia libre, desde Wikimedia Commons (R-10)
//
// Para una noticia que no trae foto, quien publica puede buscar una foto de
// archivo. Tres cosas que este módulo no deja pasar:
//
//   1. Licencias que no son libres de verdad: solo CC0, dominio público, CC BY y
//      CC BY-SA. Nada «NC» (no comercial) ni «ND» (sin derivados).
//   2. Una atribución inventada por el navegador: el crédito se arma acá, en el
//      servidor, con lo que dice Commons —autor y licencia—, y al guardar se
//      vuelve a consultar el archivo (`verificarArchivo`). El formulario solo
//      dice CUÁL archivo; no puede decir de quién es ni con qué licencia.
//   3. Que la foto pase por foto del hecho: casi nunca lo es (la de «incendio
//      forestal» suele ser de otro incendio). Eso lo resuelve la interfaz, con el
//      origen `licencia_libre` que se guarda junto a la imagen.
//
// Wikimedia pide identificarse con un User-Agent con forma de contacto.
// ===========================================================================

const API = "https://commons.wikimedia.org/w/api.php";
const AGENTE = "NoticiasVerificadas/0.2 (https://github.com/DiegoLinares11/Proyecto-Responsable-AI)";

export type ImagenLibre = {
  /** La miniatura (unos 960 px), https. Es lo que se guarda como url_imagen. */
  url: string;
  /** La página del archivo en Commons, con su licencia. */
  urlFuente: string;
  autor: string;
  licencia: string;
  /** «Autor · CC BY-SA 4.0 · Wikimedia Commons», como lo exige la licencia. */
  credito: string;
  /** Una propuesta de texto alternativo; quien publica la puede corregir. */
  alterno: string;
};

/** CC0, dominio público, CC BY y CC BY-SA. Lo «NC» o «ND» no es libre. */
export function licenciaEsLibre(nombre: string): boolean {
  const n = nombre.trim();
  if (/\b(nc|nd)\b/i.test(n)) return false;
  return /^(cc0\b|public domain\b|pd\b|pd-|cc[ -]by(-sa)?[ -]\d)/i.test(n);
}

/** Commons devuelve autor y descripción en HTML: acá quedan en texto. */
export function aTexto(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function recortar(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1).trimEnd()}…`;
}

/** «File:Incendio forestal en Galicia.jpg» → «Incendio forestal en Galicia». */
function nombreDelArchivo(titulo: string): string {
  return titulo.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
}

type Pagina = {
  title?: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: unknown } | undefined>;
  }[];
};

/**
 * Lo que se puede usar de una respuesta de la API: solo fotos con licencia
 * libre, autor conocido y URLs https. Pura, para poder probarla sin red.
 */
export function interpretarRespuesta(json: unknown): ImagenLibre[] {
  const paginas = (json as { query?: { pages?: Pagina[] } })?.query?.pages ?? [];
  const resultado: ImagenLibre[] = [];

  for (const pagina of paginas) {
    const info = pagina.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    const licencia = String(meta["LicenseShortName"]?.value ?? "");
    const autor = recortar(aTexto(String(meta["Artist"]?.value ?? "")), 80);

    if (!info?.thumburl || !info.descriptionurl) continue;
    if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) continue;
    if (!licenciaEsLibre(licencia) || autor === "") continue;

    // La miniatura trae parámetros de seguimiento (utm_*): se guardan sin ellos.
    const url = info.thumburl.split("?")[0]!;
    const urlFuente = info.descriptionurl;
    if (!url.startsWith("https://") || !urlFuente.startsWith("https://commons.wikimedia.org/")) continue;

    const descripcion = aTexto(String(meta["ImageDescription"]?.value ?? ""));
    const alterno = recortar(descripcion.length >= 5 ? descripcion : nombreDelArchivo(pagina.title ?? ""), 300);

    resultado.push({
      url,
      urlFuente,
      autor,
      licencia,
      credito: recortar(`${autor} · ${licencia} · Wikimedia Commons`, 200),
      alterno: alterno.length >= 5 ? alterno : "Fotografía de archivo de Wikimedia Commons",
    });
  }
  return resultado;
}

function parametros(extra: Record<string, string>): URLSearchParams {
  return new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "960",
    iiextmetadatafilter: "Artist|LicenseShortName|ImageDescription",
    ...extra,
  });
}

async function consultar(p: URLSearchParams, pedir: typeof fetch): Promise<unknown> {
  const respuesta = await pedir(`${API}?${p}`, {
    headers: { "User-Agent": AGENTE, "Api-User-Agent": AGENTE },
    signal: AbortSignal.timeout(8000),
  });
  if (!respuesta.ok) throw new Error(`Wikimedia Commons respondió ${respuesta.status}.`);
  return respuesta.json();
}

/** Busca fotos con licencia libre. */
export async function buscarEnCommons(consulta: string, pedir: typeof fetch = fetch): Promise<ImagenLibre[]> {
  const termino = consulta.trim().slice(0, 120);
  if (termino.length < 3) return [];
  const json = await consultar(
    parametros({
      generator: "search",
      gsrsearch: `${termino} filetype:bitmap`,
      gsrnamespace: "6",
      gsrlimit: "12",
    }),
    pedir,
  );
  return interpretarRespuesta(json);
}

/**
 * Vuelve a consultar un archivo antes de guardarlo. Lo que llegue del
 * formulario solo sirve para saber CUÁL archivo es; la URL, el autor y la
 * licencia salen de acá. Devuelve null si el archivo no existe o no es libre.
 */
export async function verificarArchivo(urlFuente: string, pedir: typeof fetch = fetch): Promise<ImagenLibre | null> {
  const coincidencia = /^https:\/\/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)$/.exec(urlFuente.trim());
  if (coincidencia === null) return null;
  const titulo = decodeURIComponent(coincidencia[1]!).replace(/_/g, " ");
  const json = await consultar(parametros({ titles: titulo }), pedir);
  return interpretarRespuesta(json)[0] ?? null;
}
