// ===========================================================================
// Clientes de Supabase
//
// Dos clientes, y la diferencia importa:
//
//   · **El del visitante** usa la llave publicable y viaja con su sesión. Todo
//     lo que haga pasa por las políticas de fila de la Fase 1. Es el que debe
//     usarse para leer y escribir en nombre de una persona.
//
//   · **El del servidor** usa la llave de servicio y SE SALTA LAS POLÍTICAS.
//     Solo para lo que, por diseño, ninguna persona puede hacer: escribir la
//     bitácora de auditoría, mover el estado de una noticia tras validarla, y
//     recalcular el ranking. Si se usa para atender una petición de usuario, se
//     tira a la basura todo el control de accesos de la Fase 1.
//
// La regla práctica: si la operación la pide una persona, va con su sesión. Si
// la hace el sistema, va con la llave de servicio.
// ===========================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { entornoPublico, entornoServidor } from "./entorno.ts";

/**
 * Cliente con la llave de servicio. **Se salta RLS.**
 *
 * Nunca se le pasa el token de un usuario: mezclar los dos haría que una
 * operación de usuario corriera con privilegios de sistema, que es exactamente
 * el fallo que las políticas de la Fase 1 existen para evitar.
 */
export function clienteDeServicio(): SupabaseClient {
  const { urlSupabase, llaveDeServicio } = entornoServidor();

  return createClient(urlSupabase, llaveDeServicio, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-origen": "servidor" } },
  });
}

/**
 * Cliente en nombre de una persona. Respeta RLS.
 *
 * `token` es el JWT de su sesión. Sin token queda como `anon`, que en esta
 * plataforma no puede nada: no hay lectura anónima.
 */
export function clienteDeVisitante(token?: string): SupabaseClient {
  const { urlSupabase, llavePublicable } = entornoPublico();

  return createClient(urlSupabase, llavePublicable, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token === undefined
      ? {}
      : { global: { headers: { Authorization: `Bearer ${token}` } } }),
  });
}
