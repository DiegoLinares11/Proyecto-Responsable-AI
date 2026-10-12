"use server";

// ===========================================================================
// Publicar una noticia
//
// Es el flujo completo del proyecto en una sola función, y el reparto de
// privilegios dentro de ella es lo que vale la pena mirar:
//
//   1. El borrador se crea con **la sesión del publicador**. Si no tiene
//      `noticias_publicar`, la política lo rechaza en el motor. Esta acción no
//      comprueba el permiso: lo comprueba la base, que es donde no se puede
//      saltar.
//
//   2. La validación corre con **la llave de servicio**, porque escribe `estado`
//      y `puntaje_veracidad`, y el trigger `impedir_edicion_de_ranking` le
//      prohíbe eso a cualquiera que no sea el sistema — incluido el autor.
//
// Es decir: el publicador puede crear, pero no puede aprobarse. Esa separación
// es el punto entero de la Fase 1, y acá es donde se usa.
// ===========================================================================

import { revalidatePath } from "next/cache";

import { clienteDelServidor, perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { clienteDeServicio } from "../../lib/supabase.ts";
import { crearBorrador, validarYResolver, ErrorDeNoticia } from "../../modules/noticias/index.ts";
import type { ImagenDeBorrador } from "../../modules/noticias/servicio.ts";
import { buscarEnCommons, verificarArchivo, type ImagenLibre } from "../../modules/imagenes/commons.ts";
import { interpretarSeccion } from "../../lib/secciones.ts";
import { entornoDelModelo } from "../../lib/entorno.ts";

export type ResultadoDePublicacion =
  | { error: string }
  | { ok: string; idNoticia: string; estado: string; puntaje: number }
  | undefined;

/**
 * La imagen de la noticia y su origen (R-10). Tres caminos: la foto del medio,
 * una foto de archivo con licencia libre, o la ilustración tipográfica.
 *
 * Las condiciones son las mismas que pusieron las migraciones. Acá se repiten
 * para poder decir cuál falta; la que manda sigue siendo la de la base.
 */
async function imagenElegida(
  datos: FormData,
  urlDeLaNota: string,
  urlImagen: string,
  creditoImagen: string,
  alternoImagen: string,
): Promise<{ imagen: ImagenDeBorrador } | { error: string }> {
  const origen = String(datos.get("origen_imagen") ?? "ilustracion");

  if (origen === "ilustracion") return { imagen: { origen: "ilustracion" } };

  if (origen === "licencia_libre") {
    // Del formulario solo se usa CUÁL archivo es. La URL, el autor y la
    // licencia se vuelven a pedir a Commons: un formulario se puede mandar a
    // mano, y la atribución no puede salir de quien publica.
    let archivo: Awaited<ReturnType<typeof verificarArchivo>>;
    try {
      archivo = await verificarArchivo(String(datos.get("url_fuente_imagen") ?? ""));
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
    // este formulario no genera imágenes con IA.
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
 * La búsqueda de fotos de archivo para el formulario. Solo con sesión: es una
 * consulta a un servicio ajeno en nombre del proyecto, no un buscador abierto.
 */
export async function buscarFotosLibres(
  consulta: string,
): Promise<{ fotos: ImagenLibre[] } | { error: string }> {
  const perfil = await perfilDelVisitante();
  if (perfil === null) return { error: "Hay que entrar para buscar imágenes." };
  try {
    return { fotos: await buscarEnCommons(consulta) };
  } catch {
    return { error: "No se pudo consultar Wikimedia Commons. Probá de nuevo en un momento." };
  }
}

export async function enviarNoticia(
  _previo: ResultadoDePublicacion,
  datos: FormData,
): Promise<ResultadoDePublicacion> {
  const perfil = await perfilDelVisitante();
  if (perfil === null) return { error: "Hay que entrar para publicar." };

  const titulo = String(datos.get("titulo") ?? "").trim();
  const resumen = String(datos.get("resumen") ?? "").trim();
  const cuerpo = String(datos.get("cuerpo") ?? "").trim();
  const urlCruda = String(datos.get("url") ?? "").trim();
  const urlImagen = String(datos.get("url_imagen") ?? "").trim();
  const creditoImagen = String(datos.get("credito_imagen") ?? "").trim();
  const alternoImagen = String(datos.get("texto_alterno_imagen") ?? "").trim();

  if (titulo.length < 10) return { error: "El titular necesita al menos 10 caracteres." };
  if (resumen.length < 20) return { error: "El resumen necesita al menos 20 caracteres." };
  if (cuerpo.length < 50) return { error: "El cuerpo necesita al menos 50 caracteres." };

  if (urlCruda !== "" && !/^https?:\/\//.test(urlCruda)) {
    return { error: "El enlace tiene que empezar con http:// o https://" };
  }

  // La sección llega de un <select>, pero un formulario se puede mandar a mano.
  // Lo desconocido cae en 'general' en vez de viajar como texto hasta la base.
  const seccion = interpretarSeccion(datos.get("seccion")) ?? "general";

  // El alcance geográfico: a quién le importa la noticia. Es lo que permite
  // que la app la ponga arriba para quien vive en esa zona (docs/requisitos.md,
  // R-09). La regla vive en la base; acá se repite para decir qué falta.
  const alcanceCrudo = String(datos.get("alcance") ?? "nacional");
  const alcance = (["local", "nacional", "internacional"] as const).find((a) => a === alcanceCrudo);
  if (alcance === undefined) return { error: "Alcance no reconocido." };

  const zona = String(datos.get("zona") ?? "").trim();
  const pais = String(datos.get("pais") ?? "").trim();
  if (zona !== "" && !/^[A-Z]{2}(-[A-Z]{2})?$/.test(zona)) return { error: "Zona no reconocida." };
  if (pais !== "" && !/^[A-Z]{2}$/.test(pais)) return { error: "País no reconocido." };

  if (alcance === "local" && zona === "") {
    return { error: "Una noticia local es local de algún lugar: elegí la zona." };
  }
  if (alcance === "nacional" && pais === "") {
    return { error: "Una noticia nacional es de algún país: elegí el país." };
  }

  const imagen = await imagenElegida(datos, urlCruda, urlImagen, creditoImagen, alternoImagen);
  if ("error" in imagen) return imagen;

  const cliente = await clienteDelServidor();

  let idNoticia: string;
  try {
    const creada = await crearBorrador(cliente, perfil.usuario.id, {
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

    revalidatePath("/");
    revalidatePath("/publicar");

    const explicacion: Record<string, string> = {
      verificada: "Se publicó: pasó las cinco señales.",
      en_revision: "Quedó en revisión. La va a leer un moderador antes de publicarse.",
      no_verificable: "No se pudo verificar. Abajo está el desglose para que puedas corregirla.",
      desmentida:
        "Una organización de verificación ya calificó esta afirmación como falsa, así que no se publica.",
    };

    return {
      ok: explicacion[resultado.estadoNuevo] ?? `Quedó en estado ${resultado.estadoNuevo}.`,
      idNoticia,
      estado: resultado.estadoNuevo,
      puntaje: resultado.veredicto.puntaje,
    };
  } catch (error) {
    revalidatePath("/publicar");
    return {
      error:
        "Se guardó el borrador pero el canal de validación falló: " +
        `${error instanceof Error ? error.message : String(error)}. ` +
        "La noticia quedó como borrador y se puede volver a enviar.",
    };
  }
}
