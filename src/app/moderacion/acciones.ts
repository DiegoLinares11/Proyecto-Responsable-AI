"use server";

// ===========================================================================
// Las decisiones del moderador, desde el portal
//
// La lógica vive en src/modules/redaccion —la misma que usa la pestaña
// «Redacción» de la app—: va con la sesión del moderador, así que el permiso
// lo comprueba la política de fila en el motor, y la llave de servicio entra
// solo para la auditoría. Acá se toma la sesión de la cookie y se refrescan las
// páginas del portal.
// ===========================================================================

import { revalidatePath } from "next/cache";

import { clienteDelServidor, perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import {
  deFormData,
  moderarNoticia,
  resolverAlertaDeContenido,
  type ResultadoDeModeracion as Resultado,
} from "../../modules/redaccion/index.ts";

export type ResultadoDeModeracion = Resultado | undefined;

export async function moderar(_previo: ResultadoDeModeracion, datos: FormData): Promise<ResultadoDeModeracion> {
  const perfil = await perfilDelVisitante();
  if (perfil === null) return { error: "Hay que entrar." };

  const resultado = await moderarNoticia(await clienteDelServidor(), perfil, deFormData(datos));
  if ("ok" in resultado) {
    revalidatePath("/moderacion");
    revalidatePath("/");
  }
  return resultado;
}

export async function resolverAlerta(
  _previo: ResultadoDeModeracion,
  datos: FormData,
): Promise<ResultadoDeModeracion> {
  const perfil = await perfilDelVisitante();
  if (perfil === null) return { error: "Hay que entrar." };

  const resultado = await resolverAlertaDeContenido(await clienteDelServidor(), perfil, deFormData(datos));
  if ("ok" in resultado) {
    revalidatePath("/moderacion");
    revalidatePath("/");
  }
  return resultado;
}
