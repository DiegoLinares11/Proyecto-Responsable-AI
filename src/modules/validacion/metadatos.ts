// ===========================================================================
// Lectura de metadatos de una página
//
// Se leen las etiquetas Open Graph (`og:title`, `og:description`,
// `article:published_time`) y, si no están, el `<title>`.
//
// A propósito sin librería de parseo: hacen falta cuatro campos de la cabecera,
// no un árbol del documento. Una expresión regular sobre `<meta>` alcanza y no
// agrega una dependencia que después hay que mantener y auditar. El precio es
// que no entiende HTML roto de formas creativas; cuando no encuentra el título,
// la señal lo reporta como "no se pudo comparar" en vez de inventar un valor.
// ===========================================================================

export type MetadatosDePagina = {
  titulo: string | null;
  descripcion: string | null;
  publicadoEn: Date | null;
};

const ENTIDADES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodificar(texto: string): string {
  return texto
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => {
      const directo = ENTIDADES[e.toLowerCase()];
      if (directo !== undefined) return directo;
      const numerico = e.match(/^&#(\d+);$/);
      if (numerico?.[1] !== undefined) {
        return String.fromCodePoint(Number(numerico[1]));
      }
      return e;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function atributo(etiqueta: string, nombre: string): string | null {
  const patron = new RegExp(
    `\\b${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    "i",
  );
  const m = etiqueta.match(patron);
  if (m === null) return null;
  const valor = m[1] ?? m[2] ?? m[3];
  return valor === undefined ? null : decodificar(valor);
}

/** Índice de las etiquetas `<meta>` por su `property` o `name`. */
function indexarMetas(html: string): Map<string, string> {
  const indice = new Map<string, string>();

  for (const [etiqueta] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const clave = atributo(etiqueta, "property") ?? atributo(etiqueta, "name");
    const contenido = atributo(etiqueta, "content");
    if (clave === null || contenido === null || contenido === "") continue;

    const normalizada = clave.toLowerCase();
    // La primera gana: las páginas a veces repiten og:title más abajo con
    // valores de plantilla.
    if (!indice.has(normalizada)) indice.set(normalizada, contenido);
  }

  return indice;
}

function leerFecha(valor: string | undefined): Date | null {
  if (valor === undefined || valor === "") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function leerMetadatos(html: string): MetadatosDePagina {
  const metas = indexarMetas(html);

  const tituloEtiqueta = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  const titulo =
    metas.get("og:title") ??
    metas.get("twitter:title") ??
    (tituloEtiqueta === undefined ? null : decodificar(tituloEtiqueta)) ??
    null;

  const descripcion =
    metas.get("og:description") ?? metas.get("description") ?? null;

  const publicadoEn =
    leerFecha(metas.get("article:published_time")) ??
    leerFecha(metas.get("article:modified_time")) ??
    leerFecha(metas.get("date")) ??
    null;

  return {
    titulo: titulo === null || titulo === "" ? null : titulo,
    descripcion,
    publicadoEn,
  };
}
