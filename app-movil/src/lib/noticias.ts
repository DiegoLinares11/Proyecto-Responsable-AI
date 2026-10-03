// ===========================================================================
// Las lecturas de la app
//
// Directo a Supabase con la llave publicable. La política de lectura pública
// (ADR 0006) deja ver SOLO las noticias verificadas: un borrador no llega acá
// aunque alguien cambie esta consulta, porque el filtro vive en la base.
// ===========================================================================

import type { Alcance, NoticiaPersonalizable } from './personalizacion';
import { supabase } from './supabase';

export type Imagen = { url: string; credito: string; alterno: string };

export type NoticiaDelFeed = NoticiaPersonalizable & {
  id: string;
  titulo: string;
  resumen: string;
  publicadaEn: string;
  seccion: string;
  imagen: Imagen | null;
  fuente: string | null;
  puntajeVeracidad: number | null;
  relevancia: number;
  /** El nombre de la zona, si es local: «Quetzaltenango». */
  zona: string | null;
};

export type Senal = {
  senal: string;
  aporte: number;
  disponible: boolean;
  detalle: Record<string, unknown>;
};

export type NoticiaCompleta = NoticiaDelFeed & {
  cuerpo: string;
  urlOriginal: string | null;
  senales: Senal[];
};

const CAMPOS =
  'id,titulo,resumen,publicada_en,seccion,url_imagen,credito_imagen,texto_alterno_imagen,' +
  'puntaje_veracidad,relevancia,alcance,pais,id_ubicacion,fuentes(nombre),ubicaciones(nombre)';

type Fila = {
  id: string;
  titulo: string;
  resumen: string;
  publicada_en: string;
  seccion: string;
  url_imagen: string | null;
  credito_imagen: string | null;
  texto_alterno_imagen: string | null;
  puntaje_veracidad: number | null;
  relevancia: number | string;
  alcance: Alcance;
  pais: string | null;
  id_ubicacion: string | null;
  fuentes: { nombre: string } | null;
  ubicaciones: { nombre: string } | null;
};

function aNoticia(f: Fila): NoticiaDelFeed {
  return {
    id: f.id,
    titulo: f.titulo,
    resumen: f.resumen,
    publicadaEn: f.publicada_en,
    seccion: f.seccion,
    // La base garantiza que si hay imagen hay crédito y texto alterno; se arma
    // así para que la app no pueda pintar una foto sin ellos.
    imagen:
      f.url_imagen && f.credito_imagen && f.texto_alterno_imagen
        ? { url: f.url_imagen, credito: f.credito_imagen, alterno: f.texto_alterno_imagen }
        : null,
    fuente: f.fuentes?.nombre ?? null,
    puntajeVeracidad: f.puntaje_veracidad,
    relevancia: Number(f.relevancia),
    alcance: f.alcance,
    pais: f.pais,
    idUbicacion: f.id_ubicacion,
    zona: f.ubicaciones?.nombre ?? null,
  };
}

export async function leerFeed(limite = 30): Promise<NoticiaDelFeed[]> {
  const { data, error } = await supabase
    .from('noticias')
    .select(CAMPOS)
    .eq('estado', 'verificada')
    .order('relevancia', { ascending: false })
    .limit(limite);

  if (error) throw new Error(`No se pudo leer la portada: ${error.message}`);
  return ((data ?? []) as unknown as Fila[]).map(aNoticia);
}

const ORDEN_DE_SENALES = [
  'credibilidad_fuente',
  'url_verificable',
  'corroboracion',
  'desmentido',
  'coherencia',
];

export async function leerNoticia(id: string): Promise<NoticiaCompleta | null> {
  const { data, error } = await supabase
    .from('noticias')
    .select(`${CAMPOS},cuerpo,url_original`)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la noticia: ${error.message}`);
  if (data === null) return null;

  const fila = data as unknown as Fila & { cuerpo: string; url_original: string | null };

  const { data: senales } = await supabase
    .from('validaciones')
    .select('senal,aporte,disponible,detalle')
    .eq('id_noticia', id);

  return {
    ...aNoticia(fila),
    cuerpo: fila.cuerpo,
    urlOriginal: fila.url_original,
    senales: ((senales ?? []) as Senal[])
      .map((s) => ({ ...s, aporte: Number(s.aporte) }))
      .sort((a, b) => ORDEN_DE_SENALES.indexOf(a.senal) - ORDEN_DE_SENALES.indexOf(b.senal)),
  };
}

/** Títulos de las noticias que citó el chat, para poder abrirlas. */
export async function titulosDe(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from('noticias').select('id,titulo').in('id', [...ids]);
  return new Map(((data ?? []) as { id: string; titulo: string }[]).map((n) => [n.id, n.titulo]));
}

/** «hace 3 h», «hace 2 días»: lo que se lee de un vistazo en un feed. */
export function haceCuanto(iso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}
