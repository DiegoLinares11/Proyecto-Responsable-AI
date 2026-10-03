// ===========================================================================
// El servicio de noticias — donde las fases dejan de estar sueltas
//
// Hasta ahora el canal de validación de la Fase 2 solo se había ejercitado desde
// scripts, la tabla `validaciones` estaba vacía y los puntajes de veracidad de la
// base los había escrito una semilla a mano. Esto es lo que conecta las piezas.
//
// El flujo, y quién puede cada paso:
//
//   crearBorrador        — con la sesión del publicador. RLS exige
//                          `noticias_publicar` y fuerza `estado = 'borrador'`,
//                          así que auto-aprobarse es imposible aunque se llame a
//                          la API a mano.
//
//   validarYResolver     — con la llave de servicio. Corre las cinco señales,
//                          guarda el desglose y mueve el estado. Ninguna persona
//                          tiene permiso para lo último, y eso es a propósito.
//
//   decidirComoModerador — con la sesión del moderador. RLS exige
//                          `noticias_moderar`.
//
// La regla que gobierna todo: nada por debajo del umbral se publica
// automáticamente (docs/validacion-noticias.md).
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  evaluarVeracidad,
  filasDeValidacion,
  candidatosDeUrl,
  type EstadoVeredicto,
  type NoticiaAValidar,
  type Veredicto,
} from "../validacion/index.ts";
import { registrar } from "../auditoria/index.ts";
import { crearDependenciasDeValidacion, type OpcionesDeValidacion } from "./puertos.ts";

/**
 * La imagen viaja entera o no viaja.
 *
 * La base ya lo exige con un CHECK; repetirlo en el tipo hace que no se pueda
 * ni construir la llamada incompleta, en vez de descubrirlo con un error de
 * Postgres después de haberle pedido todo el texto a quien publica.
 */
export type ImagenDeBorrador = {
  url: string;
  credito: string;
  alterno: string;
};

export type DatosDeBorrador = {
  titulo: string;
  resumen: string;
  cuerpo: string;
  urlOriginal: string | null;
  seccion: string;
  imagen: ImagenDeBorrador | null;
};

export class ErrorDeNoticia extends Error {
  readonly codigo: "sin_permiso" | "no_encontrada" | "estado_invalido" | "base_de_datos";

  constructor(codigo: ErrorDeNoticia["codigo"], mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeNoticia";
    this.codigo = codigo;
  }
}

/**
 * Crea un borrador en nombre del publicador.
 *
 * Va con SU cliente, no con el de servicio. Si fuera con el de servicio se
 * saltarían las políticas de la Fase 1 y el permiso `noticias_publicar` dejaría
 * de significar nada — toda la capa de control de accesos se tiraría a la
 * basura justo en la operación que existe para protegerla.
 */
export async function crearBorrador(
  clienteDelPublicador: SupabaseClient,
  idAutor: string,
  datos: DatosDeBorrador,
): Promise<{ id: string }> {
  const { data, error } = await clienteDelPublicador
    .from("noticias")
    .insert({
      titulo: datos.titulo,
      resumen: datos.resumen,
      cuerpo: datos.cuerpo,
      url_original: datos.urlOriginal,
      seccion: datos.seccion,
      url_imagen: datos.imagen?.url ?? null,
      credito_imagen: datos.imagen?.credito ?? null,
      texto_alterno_imagen: datos.imagen?.alterno ?? null,
      id_autor: idAutor,
      estado: "borrador",
    })
    .select("id")
    .single();

  if (error !== null) {
    // 42501 es el código que levantan RLS y nuestros triggers.
    if (error.code === "42501") {
      throw new ErrorDeNoticia(
        "sin_permiso",
        "No tenés permiso para publicar noticias, o intentaste crearla en un estado que no es borrador.",
      );
    }
    throw new ErrorDeNoticia("base_de_datos", `No se pudo crear el borrador: ${error.message}`);
  }

  return { id: data.id as string };
}

type FilaDeNoticia = {
  id: string;
  titulo: string;
  resumen: string;
  cuerpo: string;
  url_original: string | null;
  estado: string;
  id_autor: string;
};

/** Qué estado de la base le corresponde a cada veredicto del canal. */
const ESTADO_POR_VEREDICTO: Readonly<Record<EstadoVeredicto, string>> = {
  verificada: "verificada",
  en_revision: "en_revision",
  no_verificable: "no_verificable",
  desmentida: "desmentida",
};

export type ResultadoDeValidacion = {
  idNoticia: string;
  veredicto: Veredicto;
  estadoAnterior: string;
  estadoNuevo: string;
};

/**
 * Corre el canal de validación sobre una noticia y resuelve su estado.
 *
 * Va con la llave de servicio por dos razones, no una: lee el registro de
 * fuentes completo, y escribe `estado` y `puntaje_veracidad` — que el trigger
 * `impedir_edicion_de_ranking` le prohíbe a cualquiera que no sea el sistema,
 * incluido el autor de la noticia.
 */
export async function validarYResolver(
  clienteDeServicio: SupabaseClient,
  idNoticia: string,
  opciones: OpcionesDeValidacion & { idActor?: string | null } = {},
): Promise<ResultadoDeValidacion> {
  const { data, error } = await clienteDeServicio
    .from("noticias")
    .select("id,titulo,resumen,cuerpo,url_original,estado,id_autor")
    .eq("id", idNoticia)
    .maybeSingle();

  if (error !== null) {
    throw new ErrorDeNoticia("base_de_datos", `No se pudo leer la noticia: ${error.message}`);
  }
  if (data === null) {
    throw new ErrorDeNoticia("no_encontrada", `No existe la noticia ${idNoticia}.`);
  }

  const fila = data as FilaDeNoticia;

  // Una noticia ya desmentida no se revalida: el veto es definitivo y volver a
  // correr el canal solo gastaría llamadas a las APIs externas.
  if (fila.estado === "desmentida") {
    throw new ErrorDeNoticia(
      "estado_invalido",
      "Esta noticia está desmentida. El veto de una organización de verificación no se revalida.",
    );
  }

  const aValidar: NoticiaAValidar = {
    titulo: fila.titulo,
    resumen: fila.resumen,
    cuerpo: fila.cuerpo,
    urlOriginal: fila.url_original,
    publicadaEn: null,
  };

  const veredicto = await evaluarVeracidad(
    aValidar,
    crearDependenciasDeValidacion(clienteDeServicio, opciones),
  );

  // El desglose primero. El puntaje NUNCA se guarda solo: si la escritura de
  // las señales falla, no se mueve el estado, porque un puntaje sin su
  // evidencia es un número que nadie puede auditar.
  const filas = filasDeValidacion(idNoticia, veredicto);
  const { error: errorDesglose } = await clienteDeServicio
    .from("validaciones")
    .upsert(filas, { onConflict: "id_noticia,senal" });

  if (errorDesglose !== null) {
    throw new ErrorDeNoticia(
      "base_de_datos",
      `No se pudo guardar el desglose de validación: ${errorDesglose.message}. ` +
        "El estado de la noticia no se movió.",
    );
  }

  const estadoNuevo = ESTADO_POR_VEREDICTO[veredicto.estado];

  // La restricción `noticias_publicada_tiene_fecha` exige que solo las
  // verificadas tengan fecha de publicación.
  const idFuente = await resolverFuente(clienteDeServicio, fila.url_original);

  const { error: errorEstado } = await clienteDeServicio
    .from("noticias")
    .update({
      estado: estadoNuevo,
      puntaje_veracidad: veredicto.puntaje,
      publicada_en: estadoNuevo === "verificada" ? new Date().toISOString() : null,
      ...(idFuente === null ? {} : { id_fuente: idFuente }),
    })
    .eq("id", idNoticia);

  if (errorEstado !== null) {
    throw new ErrorDeNoticia(
      "base_de_datos",
      `El desglose se guardó pero no se pudo mover el estado: ${errorEstado.message}`,
    );
  }

  await registrar(clienteDeServicio, {
    entidad: "noticia",
    idEntidad: idNoticia,
    accion: "validada",
    idActor: opciones.idActor ?? null,
    detalle: {
      estado_anterior: fila.estado,
      estado_nuevo: estadoNuevo,
      puntaje: veredicto.puntaje,
      motivo: veredicto.motivo,
      senales: veredicto.senales.map((s) => ({
        senal: s.senal,
        aporte: s.aporte,
        maximo: s.maximo,
        disponible: s.disponible,
        veto: s.veto,
        resultado: s.detalle["resultado"] ?? null,
      })),
    },
  });

  return { idNoticia, veredicto, estadoAnterior: fila.estado, estadoNuevo };
}

/** Busca el `id_fuente` que corresponde al dominio de la URL, si está registrado. */
async function resolverFuente(
  cliente: SupabaseClient,
  urlOriginal: string | null,
): Promise<number | null> {
  if (urlOriginal === null) return null;

  const candidatos = candidatosDeUrl(urlOriginal);
  if (candidatos.length === 0) return null;

  const { data } = await cliente
    .from("fuentes")
    .select("id,dominio")
    .in("dominio", candidatos);

  if (data === null || data.length === 0) return null;

  // El candidato más específico gana: `candidatosDeUrl` los devuelve de más a
  // menos específico.
  for (const candidato of candidatos) {
    const hallada = data.find((f: { dominio: string }) => f.dominio === candidato);
    if (hallada !== undefined) return hallada.id as number;
  }
  return null;
}

export type DecisionDeModerador = "aprobar" | "rechazar" | "archivar";

/**
 * La decisión humana sobre una noticia en revisión.
 *
 * Va con la sesión del moderador: RLS exige `noticias_moderar`, así que el
 * permiso se comprueba en el motor y no aquí.
 *
 * Aprobar una noticia de un dominio que no está en el registro **anota ese
 * dominio como candidato** en la auditoría. Es la forma en que se cumple la
 * promesa del ADR 0002 —que el sistema aprenda de la corrección humana— sin
 * pasarse de la raya: una aprobación NO sube automáticamente la credibilidad del
 * medio.
 *
 * La tentación era subirla sola, y está mal. Una aprobación dice «esta nota es
 * cierta», no «este medio es confiable»; son dos juicios distintos y el segundo
 * exige mirar al medio, no a una nota suya. Convertir uno en el otro habría
 * hecho que el sistema se inventara posiciones editoriales a partir de
 * decisiones puntuales — exactamente lo que el registro curado a mano existe
 * para evitar. Así que se anota el candidato y una persona decide, con su
 * justificación escrita.
 */
export async function decidirComoModerador(
  clienteDelModerador: SupabaseClient,
  idNoticia: string,
  decision: DecisionDeModerador,
  idModerador: string,
  motivo: string,
): Promise<void> {
  const estados: Record<DecisionDeModerador, string> = {
    aprobar: "verificada",
    rechazar: "no_verificable",
    archivar: "archivada",
  };

  const estadoNuevo = estados[decision];

  const { data: antes } = await clienteDelModerador
    .from("noticias")
    .select("url_original,id_fuente")
    .eq("id", idNoticia)
    .maybeSingle();

  const { error } = await clienteDelModerador
    .from("noticias")
    .update({
      estado: estadoNuevo,
      publicada_en: estadoNuevo === "verificada" ? new Date().toISOString() : null,
    })
    .eq("id", idNoticia);

  if (error !== null) {
    if (error.code === "42501") {
      throw new ErrorDeNoticia("sin_permiso", "No tenés permiso para moderar noticias.");
    }
    throw new ErrorDeNoticia("base_de_datos", `No se pudo moderar: ${error.message}`);
  }

  await registrar(clienteDelModerador, {
    entidad: "noticia",
    idEntidad: idNoticia,
    accion: `moderada_${decision}`,
    idActor: idModerador,
    detalle: { estado_nuevo: estadoNuevo, motivo },
  });

  // Si se aprobó una nota de un medio que no está en el registro, el dominio
  // queda anotado como candidato. La decisión de agregarlo —y con qué puntaje y
  // qué justificación— sigue siendo de una persona.
  const url = (antes as { url_original: string | null; id_fuente: number | null } | null)?.url_original;
  const yaRegistrada = (antes as { id_fuente: number | null } | null)?.id_fuente;

  if (decision === "aprobar" && url != null && yaRegistrada == null) {
    const dominio = candidatosDeUrl(url).at(-1);
    if (dominio !== undefined) {
      await registrar(clienteDelModerador, {
        entidad: "fuente",
        idEntidad: dominio,
        accion: "candidata_al_registro",
        idActor: idModerador,
        detalle: {
          dominio,
          id_noticia_aprobada: idNoticia,
          nota:
            "Un moderador aprobó una noticia de este dominio y el dominio no está en el registro. " +
            "Una aprobación dice que la nota es cierta, no que el medio sea confiable: agregarlo al " +
            "registro, y con qué puntaje, es una decisión editorial que toma una persona.",
        },
      });
    }
  }
}
