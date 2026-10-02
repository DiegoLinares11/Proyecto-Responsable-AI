// ===========================================================================
// Fase 6 — Persistir el ranking
//
// La fórmula de la Fase 3 existía y estaba probada, pero nadie la corría: la
// columna `relevancia` de `noticias` tenía los valores que puso una semilla a
// mano, y `relevancia_calculada_en` estaba en null en todas las filas. El feed
// se calculaba al vuelo en un script.
//
// Esto lo cierra. Lee las dos vistas de insumos, calcula, y escribe los
// componentes de vuelta — para que el feed pueda ordenar en SQL por una columna
// indexada en vez de traerse todo a memoria, y para que la interfaz pueda
// mostrar el «¿por qué está aquí?» sin recalcular nada.
//
// Va con la llave de servicio: las vistas no están otorgadas a `authenticated`
// a propósito, y el trigger `impedir_edicion_de_ranking` le prohíbe escribir
// estas columnas a cualquiera que no sea el sistema.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { registrarVarios, type EventoDeAuditoria } from "../auditoria/index.ts";
import { calcularRelevancia } from "./calcular.ts";
import { crearCargadorDePesos, interpretarPesos } from "./pesos.ts";
import type {
  DesgloseDeRelevancia,
  EstadoNoticia,
  InsumosDeRanking,
  InteraccionDeRanking,
  Pesos,
  TipoInteraccion,
} from "./tipos.ts";

type FilaDeNoticia = {
  id_noticia: string;
  estado: string;
  publicada_en: string | null;
  credibilidad_fuente: number | null;
  puntaje_veracidad: number | null;
};

type FilaDeInteraccion = {
  id_noticia: string;
  tipo: string;
  creada_en: string;
  cuenta_creada_en: string;
  autoridad: number | null;
};

export function cargadorDePesos(cliente: SupabaseClient) {
  return crearCargadorDePesos(async () => {
    const { data, error } = await cliente
      .from("pesos_ranking")
      .select("clave,valor")
      .is("vigente_hasta", null);

    if (error !== null) throw new Error(`No se pudieron leer los pesos: ${error.message}`);

    return (data ?? []).map((f: { clave: string; valor: number | string }) => ({
      clave: f.clave,
      valor: Number(f.valor),
    }));
  });
}

export type ResultadoDelRecalculo = {
  noticiasEvaluadas: number;
  noticiasEscritas: number;
  rafagasDetectadas: number;
  pesos: Pesos;
  desgloses: readonly DesgloseDeRelevancia[];
};

/**
 * Recalcula el ranking de todas las noticias que pueden aparecer en el feed.
 *
 * El decaimiento por antigüedad cambia con cada hora que pasa, así que esto no
 * es algo que se corra «cuando algo cambia»: hay que correrlo periódicamente.
 * En Vercel va como Cron Job; en local, `node scripts/recalcular_ranking.mjs`.
 */
export async function recalcularRanking(
  clienteDeServicio: SupabaseClient,
  opciones: { ahora?: Date } = {},
): Promise<ResultadoDelRecalculo> {
  const ahora = opciones.ahora ?? new Date();
  const pesos = await cargadorDePesos(clienteDeServicio)();

  const { data: noticias, error: errorNoticias } = await clienteDeServicio
    .from("vista_noticias_ranking")
    .select("*")
    .in("estado", ["verificada", "en_revision"]);

  if (errorNoticias !== null) {
    throw new Error(`No se pudieron leer los insumos de noticias: ${errorNoticias.message}`);
  }

  const { data: interacciones, error: errorInteracciones } = await clienteDeServicio
    .from("vista_interacciones_ranking")
    .select("*");

  if (errorInteracciones !== null) {
    throw new Error(
      `No se pudieron leer los insumos de interacciones: ${errorInteracciones.message}`,
    );
  }

  const porNoticia = new Map<string, InteraccionDeRanking[]>();
  for (const fila of (interacciones ?? []) as FilaDeInteraccion[]) {
    const lista = porNoticia.get(fila.id_noticia) ?? [];
    lista.push({
      tipo: fila.tipo as TipoInteraccion,
      creadaEn: new Date(fila.creada_en),
      cuentaCreadaEn: new Date(fila.cuenta_creada_en),
      autoridad: fila.autoridad === null ? null : Number(fila.autoridad),
    });
    porNoticia.set(fila.id_noticia, lista);
  }

  const desgloses: DesgloseDeRelevancia[] = [];
  const eventos: EventoDeAuditoria[] = [];

  for (const fila of (noticias ?? []) as FilaDeNoticia[]) {
    const insumos: InsumosDeRanking = {
      idNoticia: fila.id_noticia,
      estado: fila.estado as EstadoNoticia,
      publicadaEn: fila.publicada_en === null ? null : new Date(fila.publicada_en),
      credibilidadFuente:
        fila.credibilidad_fuente === null ? null : Number(fila.credibilidad_fuente),
      puntajeVeracidad: fila.puntaje_veracidad === null ? null : Number(fila.puntaje_veracidad),
      interacciones: porNoticia.get(fila.id_noticia) ?? [],
    };

    const desglose = calcularRelevancia(insumos, pesos, { ahora });
    desgloses.push(desglose);

    if (desglose.rafaga.sospechosa) {
      eventos.push({
        entidad: "noticia",
        idEntidad: desglose.idNoticia,
        accion: "rafaga_detectada",
        detalle: {
          motivo: desglose.rafaga.motivo,
          interacciones_en_la_ventana: desglose.rafaga.interaccionesEnLaVentana,
          cuentas_nuevas: desglose.rafaga.cuentasNuevasImplicadas,
        },
      });
    }
  }

  let escritas = 0;

  for (const d of desgloses) {
    const { error } = await clienteDeServicio
      .from("noticias")
      .update({
        componente_interacciones: d.componenteInteracciones,
        componente_verificadas: d.componenteVerificadas,
        componente_fuente: d.componenteFuente,
        componente_veracidad: d.componenteVeracidad,
        penalizacion_estado: d.penalizacionEstado,
        relevancia: d.relevancia,
        relevancia_calculada_en: ahora.toISOString(),
        rafaga_sospechosa: d.rafaga.sospechosa,
        rafaga_motivo: d.rafaga.sospechosa ? d.rafaga.motivo : null,
      })
      .eq("id", d.idNoticia);

    if (error !== null) {
      // Que falle una noticia no debe tumbar el lote: las demás siguen con su
      // relevancia vieja, que es peor que la nueva pero mucho mejor que nada.
      console.error(`No se pudo escribir la relevancia de ${d.idNoticia}:`, error.message);
      continue;
    }
    escritas++;
  }

  await registrarVarios(clienteDeServicio, eventos);

  return {
    noticiasEvaluadas: desgloses.length,
    noticiasEscritas: escritas,
    rafagasDetectadas: eventos.length,
    pesos,
    desgloses,
  };
}

export { interpretarPesos };
