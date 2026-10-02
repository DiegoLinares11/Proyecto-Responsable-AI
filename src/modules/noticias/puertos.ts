// ===========================================================================
// Los puertos de la Fase 2, conectados a Supabase
//
// Hasta ahora el canal de validación solo se había ejercitado desde scripts con
// adaptadores escritos a mano. Esto es la versión de verdad.
//
// Va con la llave de servicio porque la validación es una operación del
// sistema, no de una persona: lee el registro de fuentes completo y escribe el
// estado de la noticia, y ninguna persona tiene permiso para lo segundo.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  crearBuscadorDeCobertura,
  crearBuscadorDeDesmentidos,
  crearBuscadorDeFuentes,
  crearBuscadorEnCadena,
  crearBuscadorEnFeeds,
  crearTraerUrl,
  type ConsultarFuentes,
  type Dependencias,
  type FuenteConFeed,
  type FuenteRegistrada,
} from "../validacion/index.ts";

type FilaDeFuente = {
  dominio: string;
  nombre: string;
  nivel: string;
  puntaje_credibilidad: number;
};

export function crearConsultaDeFuentes(cliente: SupabaseClient): ConsultarFuentes {
  return async (dominios) => {
    const { data, error } = await cliente
      .from("fuentes")
      .select("dominio,nombre,nivel,puntaje_credibilidad")
      .in("dominio", dominios);

    if (error !== null) throw new Error(`No se pudo leer el registro de fuentes: ${error.message}`);

    return (data ?? []).map(
      (f: FilaDeFuente): FuenteRegistrada => ({
        dominio: f.dominio,
        nombre: f.nombre,
        nivel: f.nivel,
        puntajeCredibilidad: f.puntaje_credibilidad,
      }),
    );
  };
}

export function crearListadoDeFeeds(cliente: SupabaseClient) {
  return async (): Promise<FuenteConFeed[]> => {
    const { data, error } = await cliente
      .from("fuentes")
      .select("dominio,url_rss")
      .not("url_rss", "is", null);

    if (error !== null) throw new Error(`No se pudieron leer los feeds: ${error.message}`);

    return (data ?? [])
      .filter((f: { url_rss: string | null }) => f.url_rss !== null)
      .map((f: { dominio: string; url_rss: string | null }) => ({
        dominio: f.dominio,
        urlRss: f.url_rss as string,
      }));
  };
}

export type OpcionesDeValidacion = {
  llaveFactCheck?: string | undefined;
  /**
   * Si es false, se acepta publicar sin haber comprobado desmentidos. Es una
   * decisión editorial y queda registrada en el detalle de la señal.
   */
  exigirVerificadorDeHechos?: boolean;
};

/**
 * Arma las dependencias del canal de validación.
 *
 * La corroboración va en cadena: primero GDELT, y si no responde —limita por
 * dirección IP y desde una red compartida devuelve 429 pase lo que pase— los
 * feeds que publican los medios del registro. Ver docs/validacion-noticias.md.
 */
export function crearDependenciasDeValidacion(
  cliente: SupabaseClient,
  opciones: OpcionesDeValidacion = {},
): Dependencias {
  const buscarFuente = crearBuscadorDeFuentes(crearConsultaDeFuentes(cliente));

  return {
    buscarFuente,
    traerUrl: crearTraerUrl(),
    buscarCobertura: crearBuscadorEnCadena([
      { nombre: "gdelt", buscar: crearBuscadorDeCobertura() },
      {
        nombre: "feeds-del-registro",
        buscar: crearBuscadorEnFeeds({ listarFuentes: crearListadoDeFeeds(cliente) }),
      },
    ]),
    buscarDesmentidos: crearBuscadorDeDesmentidos(opciones.llaveFactCheck),
    exigirVerificadorDeHechos: opciones.exigirVerificadorDeHechos ?? true,
  };
}
