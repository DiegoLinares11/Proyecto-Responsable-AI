// ===========================================================================
// Lecturas del servidor para la interfaz
//
// ⚠ DEUDA CONOCIDA, Y ES LA PRIMERA DE LA LISTA: estas lecturas van con la
// llave de servicio, que SE SALTA las políticas de fila de la Fase 1.
//
// La razón es que todavía no hay autenticación: sin sesión, el cliente del
// visitante queda como `anon`, y en esta plataforma `anon` no puede nada a
// propósito — no hay lectura anónima. Así que mientras no exista el inicio de
// sesión, la alternativa a esto es una pantalla vacía.
//
// Lo que se hace para que la deuda no se vuelva un agujero:
//
//   · Cada consulta filtra `estado = 'verificada'` EXPLÍCITAMENTE. No se confía
//     en que RLS lo haga, porque aquí RLS no está corriendo.
//   · Se seleccionan columnas por nombre, nunca `*`. Así una columna nueva no
//     se publica sola.
//   · No hay ninguna función aquí que lea borradores, noticias en moderación,
//     la bitácora ni datos de usuarios.
//
// Cuando entre la autenticación, esto se reescribe para recibir el token del
// visitante y las políticas vuelven a ser la frontera. Hasta entonces, el filtro
// explícito es lo único que separa el feed público de la base completa, y eso
// hay que decirlo en voz alta en vez de que se olvide.
// ===========================================================================

import { clienteDeServicio } from "./supabase.ts";

export type NoticiaDelFeed = {
  id: string;
  titulo: string;
  resumen: string;
  publicadaEn: string;
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
  "componente_interacciones,componente_verificadas,componente_fuente,componente_veracidad," +
  "rafaga_sospechosa,fuentes(nombre,puntaje_credibilidad)";

type FilaDelFeed = {
  id: string;
  titulo: string;
  resumen: string;
  publicada_en: string;
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

/** El feed: solo verificadas, de mayor a menor relevancia. */
export async function leerFeed(limite = 20): Promise<NoticiaDelFeed[]> {
  const { data, error } = await clienteDeServicio()
    .from("noticias")
    .select(CAMPOS_DEL_FEED)
    .eq("estado", "verificada")
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
  senales: SenalDeValidacion[];
};

/** Una noticia verificada con su desglose de validación. */
export async function leerNoticia(id: string): Promise<NoticiaConDesglose | null> {
  const cliente = clienteDeServicio();

  const { data, error } = await cliente
    .from("noticias")
    .select(`${CAMPOS_DEL_FEED},cuerpo,url_original`)
    .eq("estado", "verificada")
    .eq("id", id)
    .maybeSingle();

  if (error !== null) throw new Error(`No se pudo leer la noticia: ${error.message}`);
  if (data === null) return null;

  const fila = data as unknown as FilaDelFeed & { cuerpo: string; url_original: string | null };

  const { data: senales } = await cliente
    .from("validaciones")
    .select("senal,aporte,disponible,detalle")
    .eq("id_noticia", id);

  const ORDEN = ["credibilidad_fuente", "url_verificable", "corroboracion", "desmentido", "coherencia"];

  return {
    ...aNoticia(fila),
    cuerpo: fila.cuerpo,
    urlOriginal: fila.url_original,
    senales: ((senales ?? []) as SenalDeValidacion[])
      .map((s) => ({ ...s, aporte: Number(s.aporte) }))
      .sort((a, b) => ORDEN.indexOf(a.senal) - ORDEN.indexOf(b.senal)),
  };
}
