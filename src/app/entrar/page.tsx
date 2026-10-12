"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { entrar, entrarConGoogle, registrarse, type ResultadoDeEntrada } from "./acciones.ts";

// `useSearchParams` necesita un límite de Suspense: sin él, `next build` no puede
// pre-renderizar la página.
export default function Entrar() {
  return (
    <Suspense>
      <FormulariosDeEntrada />
    </Suspense>
  );
}

function FormulariosDeEntrada() {
  const errorDeGoogle = useSearchParams().get("error") === "google";
  const [estadoEntrada, accionEntrar, entrando] = useActionState<ResultadoDeEntrada, FormData>(
    entrar,
    undefined,
  );
  const [estadoAlta, accionRegistrarse, registrando] = useActionState<ResultadoDeEntrada, FormData>(
    registrarse,
    undefined,
  );

  return (
    <article style={{ maxWidth: "24rem" }}>
      <h2 style={{ fontSize: "1.2rem" }}>Entrar</h2>
      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem" }}>
        Para leer el feed no hace falta cuenta. La necesitás para comentar, reaccionar, publicar o
        moderar.
      </p>

      {/* La misma cuenta que en la app del teléfono. */}
      <form action={entrarConGoogle} className="formulario">
        <button type="submit" className="boton-google">
          <span aria-hidden="true" style={{ color: "#4285F4", fontWeight: 800 }}>
            G
          </span>{" "}
          Entrar con Google
        </button>
        {errorDeGoogle ? (
          <p className="error">
            No se pudo entrar con Google. Si el problema sigue, revisá que esta dirección esté en
            las Redirect URLs del proyecto de Supabase.
          </p>
        ) : null}
      </form>

      <p style={{ color: "var(--tinta-tenue)", fontSize: "0.8125rem", margin: "1.5rem 0 0" }}>
        O con correo y contraseña:
      </p>

      <form action={accionEntrar} className="formulario">
        <label>
          Correo
          <input name="correo" type="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input name="clave" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
        {estadoEntrada?.error === undefined ? null : (
          <p className="error">{estadoEntrada.error}</p>
        )}
      </form>

      <h3 style={{ fontSize: "1.05rem", marginTop: "2.5rem" }}>¿No tenés cuenta?</h3>
      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem" }}>
        Todas las cuentas nuevas entran como <strong>lector</strong>. Publicar y moderar son
        permisos que da un administrador: nadie se los asigna solo.
      </p>

      <form action={accionRegistrarse} className="formulario">
        <label>
          Nombre
          <input name="nombre" type="text" autoComplete="name" required minLength={2} />
        </label>
        <label>
          Correo
          <input name="correo" type="email" autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <input name="clave" type="password" autoComplete="new-password" required minLength={8} />
        </label>
        <button type="submit" disabled={registrando}>
          {registrando ? "Creando…" : "Crear cuenta"}
        </button>
        {estadoAlta?.error === undefined ? null : <p className="error">{estadoAlta.error}</p>}
      </form>
    </article>
  );
}
