"use client";

import { useActionState } from "react";

import { entrar, registrarse, type ResultadoDeEntrada } from "./acciones.ts";

export default function Entrar() {
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
