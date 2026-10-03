// ===========================================================================
// Lecturas de la interfaz
//
// Van con la sesión del visitante, no con la llave de servicio. Eso significa
// que **las políticas de fila de la Fase 1 son las que deciden qué devuelve cada
// consulta**, y no un filtro que el código se acuerde de poner.
//
// La diferencia es la que hay entre un control y una costumbre. Antes estas
// funciones usaban la llave de servicio —porque sin lectura anónima la
// alternativa era una pantalla vacía— y el filtro `estado = 'verificada'` lo
// ponía el código: si alguien lo olvidaba en una consulta nueva, el borrador de
// otro quedaba expuesto y nada fallaba. Ahora el filtro vive en la política, el
// código no puede olvidarlo, y una consulta nueva nace segura.
//
// Los filtros por estado que quedan abajo son por CLARIDAD y para no traer
// filas que después se descartan. Ya no son la frontera.
// ===========================================================================

import { clienteDelServidor } from "./supabase-servidor.ts";
import { agruparAlertas, type AlertaDeContenido, type FilaDeAlerta } from "./alertas.ts";

export type { AlertaDeContenido };

import type { SeccionDeNoticia } from "./secciones.ts";

/**
 * La imagen viaja como un objeto o como null, nunca como tres campos sueltos.
 * La base ya garantiza que si hay url hay crédito y texto alterno; armarlo así
 * hace que la interfaz no pueda pintar una foto sin ellos aunque se descuide.
 */
export type ImagenDeNoticia = {
  url: string;
  credito: string;
  alterno: string;
};

export type NoticiaDelFeed = {
  id: string;
  titulo: string;
  resumen: string;
  publicadaEn: string;
  seccion: SeccionDeNoticia;
  imagen: ImagenDeNoticia | null;
  fuente: string | null;
  credibilidadFuente: number | null;
  puntajeVeracidad: number | null;
  relevancia: number;
  componentes: {
    interacciones: number;
    verificadas: number;
    fuente: number;
    veracidad: number;
  };
  rafagaSospechosa: boolean;
};

const CAMPOS_DEL_FEED =
  "id,titulo,resumen,publicada_en,puntaje_veracidad,relevancia," +
  "seccion,url_imagen,credito_imagen,texto_alterno_imagen," +
  "componente_interacciones,componente_verificadas,componente_fuente,componente_veracidad," +
  "rafaga_sospechosa,fuentes(nombre,puntaje_credibilidad)";

type FilaDelFeed = {
  id: string;
  titulo: string;
  resumen: string;
  publicada_en: string;
  seccion: SeccionDeNoticia;
  url_imagen: string | null;
  credito_imagen: string | null;
  texto_alterno_imagen: string | null;
  puntaje_veracidad: number | null;
  relevancia: number | string;
  componente_interacciones: number | string;
  componente_verificadas: number | string;
  componente_fuente: number | string;
  componente_veracidad: number | string;
  rafaga_sospechosa: boolean;
  fuentes: { nombre: string; puntaje_credibilidad: number } | null;
};

function aNoticia(fila: FilaDelFeed): NoticiaDelFeed {
  return {
    id: fila.id,
    titulo: fila.titulo,
    resumen: fila.resumen,
    publicadaEn: fila.publicada_en,
    seccion: fila.seccion,
    imagen:
      fila.url_imagen !== null &&
      fila.credito_imagen !== null &&
      fila.texto_alterno_imagen !== null
        ? {
            url: fila.url_imagen,
            credito: fila.credito_imagen,
            alterno: fila.texto_alterno_imagen,
          }
        : null,
    fuente: fila.fuentes?.nombre ?? null,
    credibilidadFuente: fila.fuentes?.puntaje_credibilidad ?? null,
    puntajeVeracidad: fila.puntaje_veracidad,
    relevancia: Number(fila.relevancia),
    componentes: {
      interacciones: Number(fila.componente_interacciones),
      verificadas: Number(fila.componente_verificadas),
      fuente: Number(fila.componente_fuente),
      veracidad: Number(fila.componente_veracidad),
    },
    rafagaSospechosa: fila.rafaga_sospechosa,
  };
}

/** El feed: de mayor a menor relevancia. La política decide qué filas llegan. */
export async function leerFeed(
  opciones: { limite?: number; seccion?: SeccionDeNoticia | null } = {},
): Promise<NoticiaDelFeed[]> {
  const { limite = 20, seccion = null } = opciones;
  const cliente = await clienteDelServidor();

  let consulta = cliente
    .from("noticias")
    .select(CAMPOS_DEL_FEED)
    .eq("estado", "verificada");

  if (seccion !== null) consulta = consulta.eq("seccion", seccion);

  const { data, error } = await consulta
    .order("relevancia", { ascending: false })
    .limit(limite);

  if (error !== null) throw new Error(`No se pudo leer el feed: ${error.message}`);
  return ((data ?? []) as unknown as FilaDelFeed[]).map(aNoticia);
}

export type SenalDeValidacion = {
  senal: string;
  aporte: number;
  disponible: boolean;
  detalle: Record<string, unknown>;
};

export type NoticiaConDesglose = NoticiaDelFeed & {
  cuerpo: string;
  urlOriginal: string | null;
  estado: string;
  senales: SenalDeValidacion[];
};

const ORDEN_DE_SENALES = [
  "credibilidad_fuente",
  "url_verificable",
  "corroboracion",
  "desmentido",
  "coherencia",
];

/**
 * Una noticia con su desglose.
 *
 * No filtra por estado: si quien mira es el autor o un moderador, la política le
 * deja ver su borrador, y esta pantalla es justamente donde tiene que poder ver
 * por qué el canal lo dejó donde lo dejó. Para cualquier otro, la política
 * devuelve vacío y la página responde 404.
 */
export async function leerNoticia(id: string): Promise<NoticiaConDesglose | null> {
  const cliente = await clienteDelServidor();

  const { data, error } = await cliente
    .from("noticias")
    .select(`${CAMPOS_DEL_FEED},cuerpo,url_original,estado`)
    .eq("id", id)
    .maybeSingle();

  if (error !== null) throw new Error(`No se pudo leer la noticia: ${error.message}`);
  if (data === null) return null;

  const fila = data as unknown as FilaDelFeed & {
    cuerpo: string;
    url_original: string | null;
    estado: string;
  };

  const { data: senales } = await cliente
    .from("validaciones")
    .select("senal,aporte,disponible,detalle")
    .eq("id_noticia", id);

  return {
    ...aNoticia(fila),
    cuerpo: fila.cuerpo,
    urlOriginal: fila.url_original,
    estado: fila.estado,
    senales: ((senales ?? []) as SenalDeValidacion[])
      .map((s) => ({ ...s, aporte: Number(s.aporte) }))
      .sort((a, b) => ORDEN_DE_SENALES.indexOf(a.senal) - ORDEN_DE_SENALES.indexOf(b.senal)),
  };
}

export type NoticiaEnRevision = {
  id: string;
  titulo: string;
  resumen: string;
  urlOriginal: string | null;
  estado: string;
  puntajeVeracidad: number | null;
  creadoEn: string;
  rafagaSospechosa: boolean;
  rafagaMotivo: string | null;
};

/**
 * La cola de moderación.
 *
 * Devuelve filas solo si quien pregunta tiene `noticias_moderar`: eso lo decide
 * la política `noticias_lectura`, no un `if` de este lado. Para cualquier otro
 * la lista sale vacía, que es el comportamiento correcto — no hay una ruta por
 * la que un error de este código exponga la cola.
 */
export async function leerColaDeModeracion(): Promise<NoticiaEnRevision[]> {
  const cliente = await clienteDelServidor();

  const { data, error } = await cliente
    .from("noticias")
    .select("id,titulo,resumen,url_original,estado,puntaje_veracidad,creado_en,rafaga_sospechosa,rafaga_motivo")
    .in("estado", ["en_revision", "no_verificable"])
    .order("creado_en", { ascending: true })
    .limit(50);

  if (error !== null) throw new Error(`No se pudo leer la cola: ${error.message}`);

  return ((data ?? []) as Array<{
    id: string;
    titulo: string;
    resumen: string;
    url_original: string | null;
    estado: string;
    puntaje_veracidad: number | null;
    creado_en: string;
    rafaga_sospechosa: boolean;
    rafaga_motivo: string | null;
  }>).map((f) => ({
    id: f.id,
    titulo: f.titulo,
    resumen: f.resumen,
    urlOriginal: f.url_original,
    estado: f.estado,
    puntajeVeracidad: f.puntaje_veracidad,
    creadoEn: f.creado_en,
    rafagaSospechosa: f.rafaga_sospechosa,
    rafagaMotivo: f.rafaga_motivo,
  }));
}

/** Los borradores de quien pregunta. La política ya limita a los propios. */
export async function leerMisBorradores(): Promise<NoticiaEnRevision[]> {
  const cliente = await clienteDelServidor();

  const { data, error } = await cliente
    .from("noticias")
    .select("id,titulo,resumen,url_original,estado,puntaje_veracidad,creado_en,rafaga_sospechosa,rafaga_motivo")
    .in("estado", ["borrador", "en_revision", "no_verificable"])
    .order("creado_en", { ascending: false })
    .limit(30);

  if (error !== null) throw new Error(`No se pudieron leer los borradores: ${error.message}`);

  return ((data ?? []) as Array<Record<string, unknown>>).map((f) => ({
    id: f["id"] as string,
    titulo: f["titulo"] as string,
    resumen: f["resumen"] as string,
    urlOriginal: f["url_original"] as string | null,
    estado: f["estado"] as string,
    puntajeVeracidad: f["puntaje_veracidad"] as number | null,
    creadoEn: f["creado_en"] as string,
    rafagaSospechosa: f["rafaga_sospechosa"] as boolean,
    rafagaMotivo: f["rafaga_motivo"] as string | null,
  }));
}

// ---------------------------------------------------------------------------
// Alertas de contenido
// ---------------------------------------------------------------------------

/**
 * Las alertas pendientes, agrupadas por noticia (ver `agruparAlertas`).
 *
 * Va con la sesión del visitante, y la política `alertas_lectura_por_moderador`
 * decide qué vuelve: para cualquier rol sin `noticias_moderar`, la lista llega
 * vacía.
 */
export async function leerAlertasDeContenido(): Promise<AlertaDeContenido[]> {
  const cliente = await clienteDelServidor();

  const { data, error } = await cliente
    .from("alertas_de_contenido")
    .select(
      "id_noticia,comprobacion,evidencia,detectada_en," +
        // `noticias` tiene dos llaves hacia `usuarios` —el autor y quien revisó una
        // ráfaga—, así que el embebido se nombra; sin eso PostgREST responde 300 y
        // la pantalla de moderación entera se cae.
        "noticias(titulo,estado,autor:usuarios!noticias_id_autor_fkey(nombre),fuentes(nombre))",
    )
    .is("descartada_en", null)
    .order("detectada_en", { ascending: false })
    .limit(500);

  if (error !== null) throw new Error(`No se pudieron leer las alertas: ${error.message}`);

  return agruparAlertas((data ?? []) as unknown as FilaDeAlerta[]);
}
