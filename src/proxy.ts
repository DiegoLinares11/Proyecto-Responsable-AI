// ===========================================================================
// Refresco de sesión en cada petición
//
// Los tokens de Supabase caducan. Sin esto, la sesión de alguien se vence
// mientras navega y las lecturas empiezan a comportarse como las de un visitante
// sin cuenta — que con RLS activo significa que la pantalla se vacía sin decir
// por qué. El proxy refresca el token y reescribe las cookies antes de que la
// petición llegue a la página.
//
// Dos cosas que NO hace, a propósito:
//
//   · **No autoriza nada.** No decide quién entra a qué. Eso lo deciden las
//     políticas de fila cuando la operación llega a la base. Un proxy que
//     autoriza es un control que se puede saltar llamando a la API de Supabase
//     directamente, y esa API está publicada en internet.
//
//   · **No redirige a quien no tiene sesión.** El feed es público (ver la
//     migración 20261002120000) y exigir cuenta para leer contradeciría el
//     propósito de la plataforma.
// ===========================================================================

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(peticion: NextRequest) {
  let respuesta = NextResponse.next({ request: peticion });

  const cliente = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return peticion.cookies.getAll();
        },
        setAll(galletas) {
          for (const { name, value } of galletas) {
            peticion.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request: peticion });
          for (const { name, value, options } of galletas) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Esta llamada es la que dispara el refresco. Tiene que ser `getUser` y no
  // `getSession`: la primera valida el token contra el servidor de auth, la
  // segunda solo lee la cookie, que el cliente puede haber tocado.
  await cliente.auth.getUser();

  return respuesta;
}

export const config = {
  matcher: [
    // Todo menos los archivos estáticos y las imágenes, que no necesitan
    // sesión y pagarían el costo de una llamada a auth en cada una.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
