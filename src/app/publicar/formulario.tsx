"use client";

import { useActionState } from "react";

import { enviarNoticia, type ResultadoDePublicacion } from "./acciones.ts";

// La sección la elige quien publica. No la infiere ningún modelo: clasificar una
// nota es una decisión editorial, y el ADR 0002 dice dónde van esas (ADR 0002).
const SECCIONES: ReadonlyArray<readonly [string, string]> = [
  ["general", "Última hora"],
  ["guatemala", "Guatemala"],
  ["mundo", "Mundo"],
  ["politica", "Política"],
  ["economia", "Economía"],
  ["deportes", "Deportes"],
  ["cultura", "Cultura"],
  ["tecnologia", "Tecnología"],
];

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
          Sección
          <select name="seccion" defaultValue="general">
            {SECCIONES.map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
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

        <label>
          Imagen de portada <span className="pista">(opcional, solo https)</span>
          <input name="url_imagen" type="url" placeholder="https://..." />
        </label>
        <label>
          Crédito de la imagen <span className="pista">(obligatorio si hay imagen)</span>
          <input name="credito_imagen" maxLength={200} placeholder="Fotografía: nombre / medio" />
        </label>
        <label>
          Texto alternativo <span className="pista">(obligatorio si hay imagen)</span>
          <input
            name="texto_alterno_imagen"
            maxLength={300}
            placeholder="Qué se ve en la foto, para quien no puede verla"
          />
        </label>
        <p style={{ fontSize: "0.78rem", color: "var(--tinta-suave)", margin: 0 }}>
          El crédito y el texto alternativo no son opcionales cuando hay foto, y la regla vive en
          la base de datos: publicar la imagen de alguien sin atribuirla, en una plataforma que
          argumenta sobre la procedencia, sería contradecirse en la portada.
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
