// ===========================================================================
// La redacción: publicar y moderar
//
// Una sola implementación para los dos caminos que llegan acá: las páginas del
// portal (sesión por cookie) y la pestaña «Redacción» de la app (token en la
// cabecera Authorization, vía /api/redaccion). Cada función recibe el cliente
// de la SESIÓN de quien pide —así las políticas de fila deciden qué puede
// hacer— y lee los campos con `Campo`, sin saber si vienen de un formulario o
// de un JSON. Las reglas son exactamente las mismas por los dos caminos.
//
// Lo que no hace: revalidar páginas de Next. Eso queda en las acciones del
// portal, que son las únicas que tienen páginas que refrescar.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

import { clienteDeServicio } from "../../lib/supabase.ts";
import { entornoDelModelo } from "../../lib/entorno.ts";
import { interpretarSeccion } from "../../lib/secciones.ts";
import type { PerfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { registrar } from "../auditoria/index.ts";
import { verificarArchivo } from "../imagenes/commons.ts";
import { crearBorrador, decidirComoModerador, ErrorDeNoticia, validarYResolver } from "../noticias/index.ts";
import type { ImagenDeBorrador } from "../noticias/servicio.ts";

/** Un campo de texto, venga de un FormData o de un JSON. */
export type Campo = (nombre: string) => string;

export function deFormData(datos: FormData): Campo {
  return (nombre) => String(datos.get(nombre) ?? "");
}

export function deObjeto(objeto: unknown): Campo {
  const o = (typeof objeto === "object" && objeto !== null ? objeto : {}) as Record<string, unknown>;
  return (nombre) => {
    const v = o[nombre];
    return typeof v === "string" || typeof v === "number" ? String(v) : "";
  };
}

// ---------------------------------------------------------------------------
// Publicar
// ---------------------------------------------------------------------------

export type ResultadoDePublicacion =
  | { error: string }
  | { ok: string; idNoticia: string; estado: string; puntaje: number };

/**
 * La imagen de la noticia y su origen (R-10). Tres caminos: la foto del medio,
 * una foto de archivo con licencia libre, o la ilustración tipográfica.
 *
 * Las condiciones son las mismas que pusieron las migraciones. Acá se repiten
 * para poder decir cuál falta; la que manda sigue siendo la de la base.
 */
async function imagenElegida(campo: Campo, urlDeLaNota: string): Promise<{ imagen: ImagenDeBorrador } | { error: string }> {
  const origen = campo("origen_imagen") || "ilustracion";
  const urlImagen = campo("url_imagen").trim();
  const creditoImagen = campo("credito_imagen").trim();
  const alternoImagen = campo("texto_alterno_imagen").trim();

  if (origen === "ilustracion") return { imagen: { origen: "ilustracion" } };

  if (origen === "licencia_libre") {
    // Del formulario solo se usa CUÁL archivo es. La URL, el autor y la
    // licencia se vuelven a pedir a Commons: un formulario se puede mandar a
    // mano, y la atribución no puede salir de quien publica.
    let archivo: Awaited<ReturnType<typeof verificarArchivo>>;
    try {
      archivo = await verificarArchivo(campo("url_fuente_imagen"));
    } catch {
      return { error: "No se pudo consultar Wikimedia Commons para confirmar la licencia. Probá de nuevo." };
    }
    if (archivo === null) {
      return { error: "Esa foto no está en Wikimedia Commons o no tiene una licencia libre. Elegí otra." };
    }
    return {
      imagen: {
        origen: "licencia_libre",
        url: archivo.url,
        credito: archivo.credito,
        alterno: alternoImagen.length >= 5 ? alternoImagen.slice(0, 300) : archivo.alterno,
        urlFuente: archivo.urlFuente,
      },
    };
  }

  if (origen !== "medio") {
    // «generada_ia» existe en la base para rotularla si algún día se usa, pero
    // la redacción no genera imágenes con IA.
    return { error: "Origen de imagen no reconocido." };
  }

  if (!urlImagen.startsWith("https://")) {
    return { error: "La imagen tiene que ser https. Una imagen por http la bloquea el navegador." };
  }
  if (creditoImagen.length < 2) {
    return {
      error:
        "Si ponés imagen, decí de quién es. Publicar la foto de alguien sin atribuirla no va " +
        "en una plataforma que argumenta sobre la procedencia.",
    };
  }
  if (alternoImagen.length < 5) {
    return {
      error:
        "Si ponés imagen, escribí el texto alternativo. Sin él, quien usa lector de pantalla " +
        "no se entera de que la foto existe.",
    };
  }
  return {
    imagen: {
      origen: "medio",
      url: urlImagen,
      credito: creditoImagen,
      alterno: alternoImagen,
      urlFuente: urlDeLaNota.startsWith("https://") ? urlDeLaNota : null,
    },
  };
}

/**
 * El flujo completo de publicar, y el reparto de privilegios es lo que vale la
 * pena mirar:
 *
 *   1. El borrador se crea con **la sesión del publicador**. Si no tiene
 *      `noticias_publicar`, la política lo rechaza en el motor.
 *   2. La validación corre con **la llave de servicio**, porque escribe `estado`
 *      y `puntaje_veracidad`, y el trigger `impedir_edicion_de_ranking` se lo
 *      prohíbe a cualquiera que no sea el sistema — incluido el autor.
 *
 * El publicador puede crear, pero no puede aprobarse.
 */
export async function publicarNoticia(
  clienteDelPublicador: SupabaseClient,
  perfil: PerfilDelVisitante,
  campo: Campo,
): Promise<ResultadoDePublicacion> {
  const titulo = campo("titulo").trim();
  const resumen = campo("resumen").trim();
  const cuerpo = campo("cuerpo").trim();
  const urlCruda = campo("url").trim();

  if (titulo.length < 10) return { error: "El titular necesita al menos 10 caracteres." };
  if (resumen.length < 20) return { error: "El resumen necesita al menos 20 caracteres." };
  if (cuerpo.length < 50) return { error: "El cuerpo necesita al menos 50 caracteres." };

  if (urlCruda !== "" && !/^https?:\/\//.test(urlCruda)) {
    return { error: "El enlace tiene que empezar con http:// o https://" };
  }

  // La sección llega de una lista, pero una petición se puede mandar a mano. Lo
  // desconocido cae en 'general' en vez de viajar como texto hasta la base.
  const seccion = interpretarSeccion(campo("seccion")) ?? "general";

  // A quién le importa la noticia (R-09). La regla vive en la base; acá se
  // repite para decir qué falta.
  const alcanceCrudo = campo("alcance") || "nacional";
  const alcance = (["local", "nacional", "internacional"] as const).find((a) => a === alcanceCrudo);
  if (alcance === undefined) return { error: "Alcance no reconocido." };

  const zona = campo("zona").trim();
  const pais = campo("pais").trim();
  if (zona !== "" && !/^[A-Z]{2}(-[A-Z]{2})?$/.test(zona)) return { error: "Zona no reconocida." };
  if (pais !== "" && !/^[A-Z]{2}$/.test(pais)) return { error: "País no reconocido." };

  if (alcance === "local" && zona === "") {
    return { error: "Una noticia local es local de algún lugar: elegí la zona." };
  }
  if (alcance === "nacional" && pais === "") {
    return { error: "Una noticia nacional es de algún país: elegí el país." };
  }

  const imagen = await imagenElegida(campo, urlCruda);
  if ("error" in imagen) return imagen;

  let idNoticia: string;
  try {
    const creada = await crearBorrador(clienteDelPublicador, perfil.usuario.id, {
      titulo,
      resumen,
      cuerpo,
      urlOriginal: urlCruda === "" ? null : urlCruda,
      seccion,
      alcance,
      pais: alcance === "internacional" ? null : pais || null,
      idUbicacion: alcance === "local" ? zona : null,
      imagen: imagen.imagen,
    });
    idNoticia = creada.id;
  } catch (error) {
    if (error instanceof ErrorDeNoticia && error.codigo === "sin_permiso") {
      return {
        error:
          "Tu cuenta no tiene permiso para publicar. Los permisos los da un administrador; " +
          "nadie se los asigna solo.",
      };
    }
    return { error: error instanceof Error ? error.message : String(error) };
  }

  // A partir de acá el borrador ya existe. Si la validación falla, la noticia
  // queda como borrador y se puede reintentar — no se pierde lo que escribió.
  const configuracion = entornoDelModelo();

  try {
    const resultado = await validarYResolver(clienteDeServicio(), idNoticia, {
      llaveFactCheck: configuracion.llaveFactCheck,
      exigirVerificadorDeHechos: configuracion.llaveFactCheck !== undefined,
      idActor: perfil.usuario.id,
    });

    // Se explica según lo que recomendó el canal, no según el estado: pasar el
    // umbral y quedar dudosa terminan las dos en revisión (R-09), pero no son
    // lo mismo para quien publica.
    const explicacion: Record<string, string> = {
      verificada:
        "Pasó las cinco señales y el canal recomienda publicarla. La publica un moderador cuando la revise.",
      en_revision: "Quedó en revisión. La va a leer un moderador antes de publicarse.",
      no_verificable: "No se pudo verificar. En el desglose de las cinco señales está qué falló.",
      desmentida:
        "Una organización de verificación ya calificó esta afirmación como falsa, así que no se publica.",
    };

    return {
      ok: explicacion[resultado.veredicto.estado] ?? `Quedó en estado ${resultado.estadoNuevo}.`,
      idNoticia,
      estado: resultado.estadoNuevo,
      puntaje: resultado.veredicto.puntaje,
    };
  } catch (error) {
    return {
      error:
        "Se guardó el borrador pero el canal de validación falló: " +
        `${error instanceof Error ? error.message : String(error)}. ` +
        "La noticia quedó como borrador y se puede volver a enviar.",
    };
  }
}

// ---------------------------------------------------------------------------
// Moderar
// ---------------------------------------------------------------------------

export type ResultadoDeModeracion = { error: string } | { ok: string };

/**
 * Una decisión sobre una noticia en revisión. Va con la sesión del moderador:
 * el permiso `noticias_moderar` lo comprueba la política de fila en el motor.
 * La llave de servicio entra solo para la auditoría (`decidirComoModerador`).
 */
export async function moderarNoticia(
  clienteDelModerador: SupabaseClient,
  perfil: PerfilDelVisitante,
  campo: Campo,
): Promise<ResultadoDeModeracion> {
  const idNoticia = campo("id");
  const decision = campo("decision");
  const motivo = campo("motivo").trim();

  if (!["aprobar", "rechazar", "archivar"].includes(decision)) {
    return { error: "Decisión no reconocida." };
  }

  // Una decisión editorial sin explicación escrita no se puede auditar después,
  // y la auditoría es la mitad del punto de tener moderación humana.
  if (motivo.length < 10) {
    return { error: "Escribí el motivo de la decisión (al menos 10 caracteres)." };
  }

  try {
    await decidirComoModerador(
      clienteDelModerador,
      clienteDeServicio(),
      idNoticia,
      decision as "aprobar" | "rechazar" | "archivar",
      perfil.usuario.id,
      motivo,
    );
  } catch (error) {
    if (error instanceof ErrorDeNoticia && error.codigo === "sin_permiso") {
      return { error: "Tu cuenta no tiene permiso para moderar." };
    }
    return { error: error instanceof Error ? error.message : String(error) };
  }

  const hechos: Record<string, string> = {
    aprobar: "Aprobada y publicada.",
    rechazar: "Marcada como no verificable.",
    archivar: "Archivada.",
  };
  return { ok: hechos[decision] ?? "Listo." };
}

/**
 * Resolver una alerta de contenido. Tres salidas, y ninguna la toma el sistema
 * solo: archivar o rechazar sacan la noticia de publicación (con la sesión del
 * moderador y auditado); descartar la deja publicada porque era un falso
 * positivo. En los tres casos las alertas pendientes se cierran con un UPDATE
 * de la sesión del moderador, que autoriza la política
 * `alertas_descarte_por_moderador`, no un `if` de acá.
 */
export async function resolverAlertaDeContenido(
  clienteDelModerador: SupabaseClient,
  perfil: PerfilDelVisitante,
  campo: Campo,
): Promise<ResultadoDeModeracion> {
  const idNoticia = campo("id");
  const decision = campo("decision");
  const motivo = campo("motivo").trim();

  if (!["archivar", "rechazar", "descartar"].includes(decision)) {
    return { error: "Decisión no reconocida." };
  }
  if (motivo.length < 10) {
    return { error: "Escribí el motivo de la decisión (al menos 10 caracteres)." };
  }

  if (decision !== "descartar") {
    try {
      await decidirComoModerador(
        clienteDelModerador,
        clienteDeServicio(),
        idNoticia,
        decision as "archivar" | "rechazar",
        perfil.usuario.id,
        motivo,
      );
    } catch (error) {
      if (error instanceof ErrorDeNoticia && error.codigo === "sin_permiso") {
        return { error: "Tu cuenta no tiene permiso para moderar." };
      }
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  const resuelta = {
    archivar: "Resuelta sacándola de publicación",
    rechazar: "Resuelta marcándola como no verificable",
    descartar: "Descartada: no era una orden",
  }[decision as "archivar" | "rechazar" | "descartar"];

  const { data, error } = await clienteDelModerador
    .from("alertas_de_contenido")
    .update({ descartada_por: perfil.usuario.id, motivo_descarte: `${resuelta}. ${motivo}` })
    .eq("id_noticia", idNoticia)
    .is("descartada_en", null)
    .select("id");

  if (error !== null) return { error: `No se pudo cerrar la alerta: ${error.message}` };

  if ((data ?? []).length === 0 && decision === "descartar") {
    return {
      error: "No se cerró ninguna alerta: o tu cuenta no puede moderar, o alguien ya la resolvió.",
    };
  }

  // El descarte no pasa por `decidirComoModerador`, así que se audita acá, y
  // solo después de que la política dejó pasar el cambio.
  if (decision === "descartar") {
    await registrar(clienteDeServicio(), {
      entidad: "noticia",
      idEntidad: idNoticia,
      accion: "alerta_descartada",
      idActor: perfil.usuario.id,
      detalle: { motivo, alertas_cerradas: (data ?? []).length },
    });
  }

  return {
    ok: {
      archivar: "Fuera de publicación. La alerta quedó cerrada.",
      rechazar: "Marcada como no verificable. La alerta quedó cerrada.",
      descartar: "Alerta descartada. La noticia sigue publicada.",
    }[decision as "archivar" | "rechazar" | "descartar"],
  };
}
