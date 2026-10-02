"use client";

import { useActionState } from "react";

import { enviarNoticia, type ResultadoDePublicacion } from "./acciones.ts";

export function FormularioDePublicacion() {
  const [estado, accion, enviando] = useActionState<ResultadoDePublicacion, FormData>(
    enviarNoticia,
    undefined,
  );

  return (
    <>
      <form action={accion} className="formulario">
        <label>
          Titular
          <input name="titulo" required minLength={10} maxLength={300} />
        </label>
        <label>
          Resumen
          <textarea name="resumen" required minLength={20} maxLength={1000} rows={3} />
        </label>
        <label>
          Cuerpo
          <textarea name="cuerpo" required minLength={50} rows={8} />
        </label>
        <label>
          Enlace al artículo original
          <input name="url" type="url" placeholder="https://..." />
        </label>
        <p style={{ fontSize: "0.78rem", color: "var(--tinta-suave)", margin: 0 }}>
          Sin enlace, la noticia no puede llegar a <code>verificada</code>: la credibilidad de la
          fuente y la comprobación de la URL son 50 de los 100 puntos, y el umbral es 75.
        </p>
        <button type="submit" disabled={enviando}>
          {enviando ? "Validando… (puede tardar medio minuto)" : "Enviar a validación"}
        </button>
      </form>

      {estado === undefined ? null : "error" in estado ? (
        <p className="error" style={{ marginTop: "1rem" }}>
          {estado.error}
        </p>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          <p className="exito">
            {estado.ok} Puntaje de veracidad: {estado.puntaje}/100.
          </p>
          <p style={{ fontSize: "0.875rem" }}>
            <a href={`/noticia/${estado.idNoticia}`}>Ver el desglose de las cinco señales</a>
          </p>
        </div>
      )}
    </>
  );
}
