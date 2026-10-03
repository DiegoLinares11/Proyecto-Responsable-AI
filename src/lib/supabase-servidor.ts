// ===========================================================================
// El cliente del servidor, con la sesión del visitante
//
// Esto es lo que cierra la deuda más grande que tenía el proyecto. Hasta ahora
// la interfaz leía con la llave de servicio, que se salta todas las políticas de
// fila: la capa de control de accesos existía pero la aplicación no la usaba.
//
// Con esto, cada lectura y cada escritura de la interfaz viaja con la sesión de
// quien la pide, y **las políticas de la Fase 1 vuelven a ser la frontera**. Un
// visitante sin cuenta queda como `anon` y ve el feed público; uno con sesión ve
// lo que su rol permita; un publicador puede crear borradores porque RLS dice
// que sí, no porque el código se acuerde de comprobarlo.
//
// La llave de servicio sigue existiendo (src/lib/supabase.ts) pero solo para lo
// que, por diseño, ninguna persona puede hacer: validar noticias, recalcular el
// ranking y escribir la bitácora.
// ===========================================================================

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export async function clienteDelServidor(): Promise<SupabaseClient> {
  const almacen = await cookies();

  return createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return almacen.getAll();
        },
        setAll(galletas) {
          try {
            for (const { name, value, options } of galletas) {
              almacen.set(name, value, options);
            }
          } catch {
            // Los componentes de servidor no pueden escribir cookies. No es un
            // error: el refresco de sesión lo hace el proxy, que sí puede.
          }
        },
      },
    },
  );
}

/**
 * El cliente con el token de la app móvil.
 *
 * La app no tiene la cookie del navegador: manda su token de Supabase en la
 * cabecera `Authorization`. Este cliente viaja con ESE token, así que las
 * políticas de fila deciden igual que con la cookie. Es la misma identidad por
 * otro camino, no un atajo: la llave de servicio no entra acá.
 */
export function clienteConToken(token: string): SupabaseClient {
  return createClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** El token de `Authorization: Bearer …`, o null si la petición no trae uno. */
export function tokenDePortador(cabecera: string | null): string | null {
  const m = cabecera?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1] ?? null;
}

export type PerfilDelVisitante = {
  usuario: User;
  idRol: number;
  rol: string;
  nombre: string;
  permisos: ReadonlySet<string>;
};

/**
 * Quién está mirando, y qué puede hacer.
 *
 * Devuelve `null` si no hay sesión. Los permisos se leen de la base, no se
 * infieren del nombre del rol: la fila es la que decide, igual que en el motor.
 *
 * ⚠ Esto sirve para DECIDIR QUÉ MOSTRAR, no para autorizar. La autorización la
 * hacen las políticas de fila cuando la operación llega a la base. Esconder un
 * botón no es un control de seguridad; que el `insert` falle, sí.
 */
export async function perfilDelVisitante(
  opciones: { token?: string | null } = {},
): Promise<PerfilDelVisitante | null> {
  const token = opciones.token ?? null;
  const cliente = token === null ? await clienteDelServidor() : clienteConToken(token);

  // `getUser` valida el token contra el servidor de auth. `getSession` solo lee
  // la cookie, que el cliente puede haber tocado. Con el token de la app pasa
  // lo mismo: se valida, no se le cree.
  const { data: sesion } =
    token === null ? await cliente.auth.getUser() : await cliente.auth.getUser(token);
  if (sesion.user === null) return null;

  const { data: perfil } = await cliente
    .from("usuarios")
    .select("nombre,id_rol,roles(clave)")
    .eq("id", sesion.user.id)
    .maybeSingle();

  if (perfil === null) return null;

  const fila = perfil as unknown as {
    nombre: string;
    id_rol: number;
    roles: { clave: string } | null;
  };

  const { data: permisos } = await cliente
    .from("permisos_rol")
    .select("clave_permiso")
    .eq("id_rol", fila.id_rol);

  return {
    usuario: sesion.user,
    idRol: fila.id_rol,
    rol: fila.roles?.clave ?? "desconocido",
    nombre: fila.nombre,
    permisos: new Set(
      ((permisos ?? []) as Array<{ clave_permiso: string }>).map((p) => p.clave_permiso),
    ),
  };
}
