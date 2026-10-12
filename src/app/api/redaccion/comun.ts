// ===========================================================================
// Lo común de /api/redaccion
//
// La pestaña «Redacción» de la app llega acá con el token de su sesión en
// `Authorization`, como el chat. Cada ruta:
//   1. valida el token contra Supabase (`perfilDelVisitante`, con getUser);
//   2. comprueba el permiso del rol, para responder 403 claro en vez de una
//      lista vacía;
//   3. trabaja con el cliente de ESA sesión, así que las políticas de fila
//      siguen siendo la frontera aunque el paso 2 tuviera un error.
// ===========================================================================

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  clienteConToken,
  perfilDelVisitante,
  tokenDePortador,
  type PerfilDelVisitante,
} from "../../../lib/supabase-servidor.ts";

// La app llama desde otro origen. La identidad viaja en `Authorization`, que un
// sitio ajeno no tiene; las cookies no se aceptan de otro origen.
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function responder(cuerpo: unknown, estado = 200) {
  return NextResponse.json(cuerpo, { status: estado, headers: CORS });
}

export type Sesion = { perfil: PerfilDelVisitante; cliente: SupabaseClient };

/** La sesión del token, con el permiso pedido; o la respuesta de error. */
export async function sesionCon(
  peticion: Request,
  permiso: "noticias_publicar" | "noticias_moderar" | "usuarios_administrar",
): Promise<Sesion | NextResponse> {
  const token = tokenDePortador(peticion.headers.get("authorization"));
  if (token === null) return responder({ error: "Hay que entrar." }, 401);

  const perfil = await perfilDelVisitante({ token });
  if (perfil === null) return responder({ error: "La sesión no es válida. Volvé a entrar." }, 401);

  if (!perfil.permisos.has(permiso)) {
    return responder({ error: `Tu cuenta es ${perfil.rol} y no tiene el permiso ${permiso}.` }, 403);
  }
  return { perfil, cliente: clienteConToken(token) };
}

export async function leerJson(peticion: Request): Promise<unknown> {
  try {
    return await peticion.json();
  } catch {
    return null;
  }
}
