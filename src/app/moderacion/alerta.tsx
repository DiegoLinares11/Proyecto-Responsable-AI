"use client";

import { useActionState } from "react";

import { resolverAlerta, type ResultadoDeModeracion } from "./acciones.ts";
import type { AlertaDeContenido } from "../../lib/alertas.ts";

const QUE_INTENTO: Readonly<Record<string, string>> = {
  sin_dominios_ajenos: "Intentó que el chatbot mandara al lector a un sitio",
  veracidad_no_inventada: "Intentó que el chatbot afirmara un puntaje que no tiene",
  confianza_no_inventada: "Intentó que el chatbot la presentara como la más confiable",
};

export function FilaDeAlerta({ alerta }: { alerta: AlertaDeContenido }) {
  const [estado, accion, enviando] = useActionState<ResultadoDeModeracion, FormData>(
    resolverAlerta,
    undefined,
  );

  return (
    <div className="fila-cola alerta">
      <h3>
        <a href={`/noticia/${alerta.idNoticia}`}>{alerta.titulo}</a>
      </h3>

      <div className="meta">
        <span className="sello malo">publicada</span>
        <span>
          la publicó <strong>{alerta.autor ?? "una cuenta borrada"}</strong>
        </span>
        <span>{alerta.fuente ?? "fuente no registrada"}</span>
        <span>
          {alerta.veces === 1 ? "1 bloqueo" : `${alerta.veces} bloqueos`}, el último el{" "}
          {new Date(alerta.ultimaVez).toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>

      <ul className="evidencias">
        {alerta.evidencias.map((e) => (
          <li key={`${e.comprobacion}|${e.evidencia}`}>
            {QUE_INTENTO[e.comprobacion] ?? e.comprobacion}: <code>{e.evidencia}</code>
            {e.veces > 1 ? ` (${e.veces} veces)` : null}
          </li>
        ))}
      </ul>

      <form action={accion} className="formulario" style={{ marginTop: "0.75rem", gap: "0.5rem" }}>
        <input type="hidden" name="id" value={alerta.idNoticia} />
        <label>
          Motivo de la decisión
          <input name="motivo" required minLength={10} placeholder="Qué viste en el texto y por qué decidís esto" />
        </label>
        <div className="acciones">
          <button type="submit" name="decision" value="archivar" className="peligro" disabled={enviando}>
            Sacar de publicación
          </button>
          <button type="submit" name="decision" value="rechazar" disabled={enviando}>
            Marcar no verificable
          </button>
          <button type="submit" name="decision" value="descartar" disabled={enviando}>
            Descartar: no era una orden
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
