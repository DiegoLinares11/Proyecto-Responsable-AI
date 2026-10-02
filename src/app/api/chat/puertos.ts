// ===========================================================================
// Los puertos del chatbot, conectados a Supabase
//
// La recuperación es la pieza que hace que el chatbot sea un chatbot de ESTAS
// noticias y no un modelo general con buen prompt. Tres restricciones viven
// aquí:
//
//   1. **Solo `verificada`.** El filtro está explícito en la consulta, y la
//      capa 3 lo vuelve a comprobar contra la base antes de mostrar nada. Dos
//      capas para la misma regla, porque en control de accesos una sola capa es
//      ninguna.
//
//   2. **Solo el resumen, nunca el cuerpo completo.** Ocho noticias con su
//      cuerpo entero son miles de tokens por turno, y el resumen alcanza para
//      responder una consulta. Es la decisión de presupuesto más grande del
//      chatbot después de elegir el modelo.
//
//   3. **Ordenadas por relevancia.** Si la búsqueda de texto no encuentra nada,
//      se devuelven las más relevantes y el modelo dice que no halló nada
//      específico — que es mejor que devolver vacío y que el modelo invente.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  NOTICIAS_EN_CONTEXTO,
  type DependenciasDelChatbot,
  type NoticiaParaElModelo,
  type ProveedorLlm,
  type TurnoRegistrado,
} from "../../../modules/chatbot/index.ts";

/**
 * Mientras no haya inicio de sesión, todos los turnos se le atribuyen a este
 * usuario de demostración. Lo crea `scripts/sembrar_demo.sql`.
 */
export const USUARIO_DE_DEMOSTRACION = "dddddddd-0000-0000-0000-000000000001";

const CAMPOS =
  "id,titulo,resumen,publicada_en,puntaje_veracidad,relevancia,fuentes(nombre)";

type FilaDeNoticia = {
  id: string;
  titulo: string;
  resumen: string;
  publicada_en: string;
  puntaje_veracidad: number | null;
  relevancia: number | string;
  fuentes: { nombre: string } | null;
};

function aNoticiaDelModelo(fila: FilaDeNoticia): NoticiaParaElModelo {
  return {
    id: fila.id,
    titulo: fila.titulo,
    resumen: fila.resumen,
    publicadaEn: fila.publicada_en,
    fuente: fila.fuentes?.nombre ?? "fuente no registrada",
    puntajeVeracidad: fila.puntaje_veracidad,
    relevancia: Number(fila.relevancia),
  };
}

/** Términos buscables del mensaje: sin acentos, sin palabras cortas. */
function terminos(consulta: string): string {
  return consulta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4)
    .slice(0, 6)
    .join(" ");
}

export async function crearPuertosDelChatbot(
  cliente: SupabaseClient,
  proveedor: ProveedorLlm,
  opciones: { topeDiarioPorUsuario: number },
): Promise<{ idConversacion: string; deps: DependenciasDelChatbot }> {
  const idConversacion = await conversacionDelUsuario(cliente, USUARIO_DE_DEMOSTRACION);

  const deps: DependenciasDelChatbot = {
    proveedor,

    recuperarNoticias: async (consulta, limite) => {
      const buscables = terminos(consulta);

      if (buscables !== "") {
        const { data } = await cliente
          .from("noticias")
          .select(CAMPOS)
          .eq("estado", "verificada")
          .textSearch("busqueda", buscables, { type: "plain", config: "spanish" })
          .order("relevancia", { ascending: false })
          .limit(limite);

        if (data !== null && data.length > 0) {
          return (data as unknown as FilaDeNoticia[]).map(aNoticiaDelModelo);
        }
      }

      const { data } = await cliente
        .from("noticias")
        .select(CAMPOS)
        .eq("estado", "verificada")
        .order("relevancia", { ascending: false })
        .limit(limite);

      return ((data ?? []) as unknown as FilaDeNoticia[]).map(aNoticiaDelModelo);
    },

    verificarNoticias: async (ids) => {
      if (ids.length === 0) return new Set();

      const { data } = await cliente
        .from("noticias")
        .select("id")
        .eq("estado", "verificada")
        .in("id", [...ids]);

      return new Set(((data ?? []) as Array<{ id: string }>).map((f) => f.id));
    },

    guardarTurno: (turno) => guardarTurno(cliente, turno),

    contarMensajesDeHoy: async (idUsuario) => {
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);

      const { count } = await cliente
        .from("mensajes")
        .select("id, conversaciones!inner(id_usuario)", { count: "exact", head: true })
        .eq("rol", "usuario")
        .eq("conversaciones.id_usuario", idUsuario)
        .gte("creado_en", desde.toISOString());

      return count ?? 0;
    },

    capa0: { topeDiarioPorUsuario: opciones.topeDiarioPorUsuario },
    noticiasEnContexto: NOTICIAS_EN_CONTEXTO,
  };

  return { idConversacion, deps };
}

async function conversacionDelUsuario(
  cliente: SupabaseClient,
  idUsuario: string,
): Promise<string> {
  const { data: existentes } = await cliente
    .from("conversaciones")
    .select("id")
    .eq("id_usuario", idUsuario)
    .order("ultimo_mensaje_en", { ascending: false })
    .limit(1);

  const primera = (existentes ?? [])[0] as { id: string } | undefined;
  if (primera !== undefined) return primera.id;

  const { data, error } = await cliente
    .from("conversaciones")
    .insert({ id_usuario: idUsuario })
    .select("id")
    .single();

  if (error !== null) throw new Error(`No se pudo abrir la conversación: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Escribe los dos mensajes del turno.
 *
 * Las dos filas se arman desde una misma plantilla porque PostgREST exige que
 * todos los objetos de una inserción múltiple tengan exactamente las mismas
 * claves; si no, responde 400 «All object keys must match».
 */
async function guardarTurno(cliente: SupabaseClient, turno: TurnoRegistrado): Promise<void> {
  const base = {
    id_conversacion: turno.idConversacion,
    rol: null as string | null,
    contenido: null as string | null,
    veredicto_capa0: null as string | null,
    categoria_intencion: null as string | null,
    veredicto_capa3: null as string | null,
    bloqueado: false,
    motivo_bloqueo: null as string | null,
    modelo: null as string | null,
    tokens_entrada: null as number | null,
    tokens_salida: null as number | null,
    tokens_cache: null as number | null,
    costo_usd: null as number | null,
    latencia_ms: null as number | null,
    noticias_citadas: [] as readonly string[],
  };

  const { error } = await cliente.from("mensajes").insert([
    {
      ...base,
      rol: "usuario",
      contenido: turno.mensajeDelUsuario,
      veredicto_capa0: turno.sospechas.map((s) => s.clave).join(",") || null,
      categoria_intencion: turno.categoria,
    },
    {
      ...base,
      rol: "asistente",
      contenido: turno.respuesta,
      veredicto_capa3: turno.capaQueCorto === "capa3" ? turno.motivoBloqueo : null,
      bloqueado: turno.bloqueado,
      motivo_bloqueo: turno.motivoBloqueo,
      modelo: turno.costo.modelo,
      tokens_entrada: turno.costo.tokensEntrada,
      tokens_salida: turno.costo.tokensSalida,
      tokens_cache: turno.costo.tokensCache,
      costo_usd: turno.costo.costoUsd,
      latencia_ms: turno.costo.latenciaMs,
      noticias_citadas: turno.noticiasCitadas,
    },
  ]);

  if (error !== null) throw new Error(`No se pudo registrar el turno: ${error.message}`);

  await cliente
    .from("conversaciones")
    .update({ ultimo_mensaje_en: new Date().toISOString() })
    .eq("id", turno.idConversacion);
}
