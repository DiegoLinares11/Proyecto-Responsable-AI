"use client";

import { useActionState } from "react";

import { moderar, type ResultadoDeModeracion } from "./acciones.ts";

export type NoticiaDeLaCola = {
  id: string;
  titulo: string;
  resumen: string;
  urlOriginal: string | null;
  estado: string;
  puntajeVeracidad: number | null;
  creadoEn: string;
  rafagaSospechosa: boolean;
  rafagaMotivo: string | null;
};

export function FilaDeModeracion({ noticia }: { noticia: NoticiaDeLaCola }) {
  const [estado, accion, enviando] = useActionState<ResultadoDeModeracion, FormData>(
    moderar,
    undefined,
  );

  return (
    <div className="fila-cola">
      <h3>
        <a href={`/noticia/${noticia.id}`}>{noticia.titulo}</a>
      </h3>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "var(--tinta-suave)" }}>
        {noticia.resumen}
      </p>

      <div className="meta">
        <span className={`sello ${noticia.estado === "en_revision" ? "aviso" : "malo"}`}>
          {noticia.estado === "en_revision" ? "en revisión" : "no verificable"}
        </span>
        {noticia.puntajeVeracidad === null ? null : (
          <span>veracidad {noticia.puntajeVeracidad}/100</span>
        )}
        <span>{new Date(noticia.creadoEn).toLocaleString("es-GT", { dateStyle: "short" })}</span>
        {noticia.urlOriginal === null ? (
          <span>sin enlace</span>
        ) : (
          <a href={noticia.urlOriginal} target="_blank" rel="noreferrer noopener nofollow">
            artículo original
          </a>
        )}
      </div>

      {noticia.rafagaSospechosa ? (
        <p
          style={{
            marginTop: "0.6rem",
            fontSize: "0.78rem",
            color: "var(--alerta)",
            borderLeft: "2px solid var(--alerta)",
            paddingLeft: "0.6rem",
          }}
        >
          {noticia.rafagaMotivo}
        </p>
      ) : null}

      <form action={accion} className="formulario" style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
        <input type="hidden" name="id" value={noticia.id} />
        <label>
          Motivo de la decisión
          <input name="motivo" required minLength={10} placeholder="Por qué se decide esto" />
        </label>
        <div className="acciones">
          <button type="submit" name="decision" value="aprobar" className="principal" disabled={enviando}>
            Aprobar y publicar
          </button>
          <button type="submit" name="decision" value="rechazar" disabled={enviando}>
            No verificable
          </button>
          <button type="submit" name="decision" value="archivar" disabled={enviando}>
            Archivar
          </button>
        </div>
        {estado === undefined ? null : "error" in estado ? (
          <p className="error">{estado.error}</p>
        ) : (
          <p className="exito">{estado.ok}</p>
        )}
      </form>
    </div>
  );
}
