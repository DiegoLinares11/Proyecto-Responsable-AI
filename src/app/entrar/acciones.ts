"use server";

// ===========================================================================
// Entrar, registrarse y salir
//
// Van como acciones de servidor para que las cookies de sesión las escriba el
// servidor y no el navegador. Si la sesión viviera en `localStorage`, cualquier
// script de la página podría leerla; en una cookie `httpOnly` escrita desde el
// servidor, no.
//
// Los mensajes de error no distinguen entre «ese correo no existe» y «esa
// contraseña está mal». Es a propósito: distinguirlos convierte la pantalla de
// entrada en un comprobador de qué correos tienen cuenta acá, que es información
// que no hay por qué regalar.
// ===========================================================================

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { clienteDelServidor } from "../../lib/supabase-servidor.ts";

export type ResultadoDeEntrada = { error: string } | undefined;

function leerCredenciales(datos: FormData): { correo: string; clave: string } | string {
  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");

  if (correo === "" || clave === "") return "Hacen falta el correo y la contraseña.";
  if (!correo.includes("@")) return "Ese correo no parece un correo.";

  return { correo, clave };
}

export async function entrar(_previo: ResultadoDeEntrada, datos: FormData): Promise<ResultadoDeEntrada> {
  const credenciales = leerCredenciales(datos);
  if (typeof credenciales === "string") return { error: credenciales };

  const cliente = await clienteDelServidor();
  const { error } = await cliente.auth.signInWithPassword({
    email: credenciales.correo,
    password: credenciales.clave,
  });

  if (error !== null) {
    return { error: "El correo o la contraseña no coinciden." };
  }

  redirect("/");
}

export async function registrarse(
  _previo: ResultadoDeEntrada,
  datos: FormData,
): Promise<ResultadoDeEntrada> {
  const credenciales = leerCredenciales(datos);
  if (typeof credenciales === "string") return { error: credenciales };

  const nombre = String(datos.get("nombre") ?? "").trim();
  if (nombre.length < 2) return { error: "Poné tu nombre." };

  if (credenciales.clave.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres." };
  }

  const cliente = await clienteDelServidor();
  const { data, error } = await cliente.auth.signUp({
    email: credenciales.correo,
    password: credenciales.clave,
    // El trigger `al_crear_usuario_de_auth` lee esto para armar el perfil.
    options: { data: { nombre } },
  });

  if (error !== null) {
    return { error: `No se pudo crear la cuenta: ${error.message}` };
  }

  // Sin sesión de vuelta, el proyecto tiene confirmación por correo activada.
  if (data.session === null) {
    return {
      error:
        "Cuenta creada. Revisá tu correo para confirmarla y después volvé a entrar. " +
        "(Si esto es el entorno de prueba, se puede apagar la confirmación en el panel de Supabase.)",
    };
  }

  redirect("/");
}

/**
 * Entrar con Google, la misma cuenta que en la app (R-02, R-09).
 *
 * Supabase hace de intermediario: Google le contesta a Supabase, y Supabase
 * vuelve acá a /auth/callback con un código de un solo uso. El verificador de
 * ese código (PKCE) queda en una cookie del servidor, así que el código solo
 * sirve en este navegador. La dirección de vuelta tiene que estar en la lista
 * de Redirect URLs del proyecto: Supabase rechaza cualquier otra.
 */
export async function entrarConGoogle(): Promise<void> {
  const origen = process.env["NEXT_PUBLIC_SITE_URL"] ?? (await headers()).get("origin") ?? "http://localhost:3000";

  const cliente = await clienteDelServidor();
  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origen}/auth/callback` },
  });

  if (error !== null || !data.url) redirect("/entrar?error=google");
  redirect(data.url);
}

export async function salir(): Promise<void> {
  const cliente = await clienteDelServidor();
  await cliente.auth.signOut();
  redirect("/");
}
