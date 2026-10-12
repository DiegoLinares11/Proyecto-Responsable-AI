// ===========================================================================
// La vuelta del login con Google
//
// Supabase redirige acá con `?code=…`. Se cambia por la sesión con el
// verificador que quedó en la cookie al salir (PKCE), y la sesión queda en
// cookies del servidor, como la del login con contraseña.
//
// No se acepta un `?siguiente=` de la URL: sería una redirección abierta, un
// enlace de este dominio que manda a cualquier otro. Siempre vuelve a la
// portada.
// ===========================================================================

import { NextResponse } from "next/server";

import { clienteDelServidor } from "../../../lib/supabase-servidor.ts";

export async function GET(peticion: Request) {
  const { searchParams, origin } = new URL(peticion.url);
  const codigo = searchParams.get("code");

  if (codigo !== null) {
    const cliente = await clienteDelServidor();
    const { error } = await cliente.auth.exchangeCodeForSession(codigo);
    if (error === null) return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/entrar?error=google`);
}
