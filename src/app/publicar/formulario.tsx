"use client";

import { useActionState } from "react";

import { enviarNoticia, type ResultadoDePublicacion } from "./acciones.ts";
import { SelectorDeImagen } from "./selector-de-imagen.tsx";
import { SECCIONES } from "../../lib/secciones.ts";
import type { UbicacionDisponible } from "../../lib/consultas.ts";

export function FormularioDePublicacion({ ubicaciones }: { ubicaciones: UbicacionDisponible[] }) {
  const departamentos = ubicaciones.filter((u) => u.tipo === "departamento");
  const paises = [
    { id: "GT", nombre: "Guatemala" },
    ...ubicaciones.filter((u) => u.tipo === "pais").map((u) => ({ id: u.pais, nombre: u.nombre })),
  ];

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
            {SECCIONES.map(({ clave, nombre }) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="alcance">
          <legend>¿A quién le importa?</legend>
          <label>
            Alcance
            <select name="alcance" defaultValue="nacional">
              <option value="local">Local: de una zona</option>
              <option value="nacional">Nacional: de un país</option>
              <option value="internacional">Internacional</option>
            </select>
          </label>
          <label>
            Zona <span className="pista">(solo si es local)</span>
            <select name="zona" defaultValue="">
              <option value="">—</option>
              {departamentos.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            País <span className="pista">(solo si es nacional)</span>
            <select name="pais" defaultValue="GT">
              {paises.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <p className="pista" style={{ margin: 0 }}>
            Esto decide dónde aparece en la app: una noticia local va arriba para quien eligió esa
            zona, y nunca desaparece para los demás. Lo declara quien publica; ningún modelo lo
            adivina.
          </p>
        </fieldset>
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

        <SelectorDeImagen />
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
