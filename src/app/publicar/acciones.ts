"use server";

// ===========================================================================
// Publicar una noticia, desde el portal
//
// La lógica vive en src/modules/redaccion: es la misma que usa la pestaña
// «Redacción» de la app por /api/redaccion. Acá solo se toma la sesión de la
// cookie y se refrescan las páginas del portal.
// ===========================================================================

import { revalidatePath } from "next/cache";

import { clienteDelServidor, perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { buscarEnCommons, type ImagenLibre } from "../../modules/imagenes/commons.ts";
import { deFormData, publicarNoticia, type ResultadoDePublicacion as Resultado } from "../../modules/redaccion/index.ts";

export type ResultadoDePublicacion = Resultado | undefined;

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

  const resultado = await publicarNoticia(await clienteDelServidor(), perfil, deFormData(datos));

  revalidatePath("/publicar");
  if ("ok" in resultado) revalidatePath("/");
  return resultado;
}
