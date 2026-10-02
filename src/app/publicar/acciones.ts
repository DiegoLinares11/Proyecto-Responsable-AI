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
import { entornoDelModelo } from "../../lib/entorno.ts";

export type ResultadoDePublicacion =
  | { error: string }
  | { ok: string; idNoticia: string; estado: string; puntaje: number }
  | undefined;

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

  if (titulo.length < 10) return { error: "El titular necesita al menos 10 caracteres." };
  if (resumen.length < 20) return { error: "El resumen necesita al menos 20 caracteres." };
  if (cuerpo.length < 50) return { error: "El cuerpo necesita al menos 50 caracteres." };

  if (urlCruda !== "" && !/^https?:\/\//.test(urlCruda)) {
    return { error: "El enlace tiene que empezar con http:// o https://" };
  }

  const cliente = await clienteDelServidor();

  let idNoticia: string;
  try {
    const creada = await crearBorrador(cliente, perfil.usuario.id, {
      titulo,
      resumen,
      cuerpo,
      urlOriginal: urlCruda === "" ? null : urlCruda,
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
