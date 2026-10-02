"use client";

// ===========================================================================
// El cliente del navegador
//
// Usa la llave publicable, que está hecha para viajar al cliente: no otorga
// nada por sí sola. Lo que se puede hacer con ella lo deciden las políticas de
// fila de la Fase 1, y para `anon` eso es leer noticias verificadas, el registro
// de fuentes y los pesos del ranking. Nada más.
// ===========================================================================

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

export function clienteDelNavegador(): SupabaseClient {
  // Uno solo por pestaña: cada instancia abre su propio escuchador de cambios
  // de sesión, y varios se pisan entre sí al refrescar el token.
  cliente ??= createBrowserClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
  );
  return cliente;
}
