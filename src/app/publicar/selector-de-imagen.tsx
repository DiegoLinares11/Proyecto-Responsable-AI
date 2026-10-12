"use client";

// ===========================================================================
// La imagen de una noticia, al publicarla (R-10)
//
// Tres caminos, y los tres terminan con el origen guardado en la base:
//
//   - Ilustración tipográfica: la sección y el titular sobre tinta. Sin IA, sin
//     costo, sin archivo. Es la opción por defecto porque es la única que nunca
//     se puede confundir con una foto del hecho.
//   - Foto de archivo con licencia libre, buscada en Wikimedia Commons. El
//     crédito lo arma el servidor con lo que dice Commons.
//   - La foto del medio, con su crédito y su texto alternativo.
// ===========================================================================

import { useState, useTransition } from "react";

import { buscarFotosLibres } from "./acciones.ts";
import type { ImagenLibre } from "../../modules/imagenes/commons.ts";

type Origen = "ilustracion" | "licencia_libre" | "medio";

const OPCIONES: ReadonlyArray<readonly [Origen, string, string]> = [
  ["ilustracion", "Ilustración tipográfica", "Sin foto: la sección y el titular, compuestos. No se confunde con una foto."],
  ["licencia_libre", "Foto de archivo con licencia libre", "Buscada en Wikimedia Commons. Va rotulada: casi nunca es del hecho."],
  ["medio", "Foto del medio", "La que publicó el medio con la nota, con su crédito."],
];

export function SelectorDeImagen() {
  const [origen, setOrigen] = useState<Origen>("ilustracion");
  const [consulta, setConsulta] = useState("");
  const [fotos, setFotos] = useState<ImagenLibre[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState<ImagenLibre | null>(null);
  const [alterno, setAlterno] = useState("");
  const [buscando, empezar] = useTransition();

  function buscar() {
    setError(null);
    empezar(async () => {
      const resultado = await buscarFotosLibres(consulta);
      if ("error" in resultado) {
        setError(resultado.error);
        setFotos(null);
      } else {
        setFotos(resultado.fotos);
      }
    });
  }

  function elegir(foto: ImagenLibre) {
    setElegida(foto);
    setAlterno(foto.alterno);
  }

  return (
    <fieldset className="imagen">
      <legend>Imagen de portada</legend>
      <input type="hidden" name="origen_imagen" value={origen} />

      <div className="opciones-imagen" role="radiogroup" aria-label="De dónde sale la imagen">
        {OPCIONES.map(([valor, titulo, explicacion]) => (
          <label key={valor} className={origen === valor ? "opcion elegida" : "opcion"}>
            <input
              type="radio"
              name="eleccion_imagen"
              value={valor}
              checked={origen === valor}
              onChange={() => setOrigen(valor)}
            />
            <span>
              <strong>{titulo}</strong>
              <span className="pista">{explicacion}</span>
            </span>
          </label>
        ))}
      </div>

      {origen === "ilustracion" ? (
        <div className="ilustracion muestra" aria-hidden="true">
          <span className="rotulo">SECCIÓN</span>
          <span className="titular">El titular de la noticia, compuesto en la letra del medio</span>
          <span className="etiqueta">ILUSTRACIÓN · NO ES UNA FOTOGRAFÍA</span>
        </div>
      ) : null}

      {origen === "licencia_libre" ? (
        <div className="buscador-imagen">
          <label>
            Buscar en Wikimedia Commons <span className="pista">(en español o en inglés)</span>
            <span className="fila-busqueda">
              <input
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                onKeyDown={(e) => {
                  // Enter buscaría... enviando el formulario de la noticia entero.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscar();
                  }
                }}
                placeholder="incendio forestal, Quetzaltenango, estadio…"
                maxLength={120}
              />
              <button type="button" onClick={buscar} disabled={buscando || consulta.trim().length < 3}>
                {buscando ? "Buscando…" : "Buscar"}
              </button>
            </span>
          </label>

          {error ? <p className="error">{error}</p> : null}
          {fotos !== null && fotos.length === 0 ? (
            <p className="pista">Nada con licencia libre para esa búsqueda. Probá con otras palabras.</p>
          ) : null}

          {fotos !== null && fotos.length > 0 ? (
            <ul className="fotos-libres">
              {fotos.map((foto) => (
                <li key={foto.urlFuente}>
                  <button
                    type="button"
                    onClick={() => elegir(foto)}
                    aria-pressed={elegida?.urlFuente === foto.urlFuente}
                    className={elegida?.urlFuente === foto.urlFuente ? "foto-libre elegida" : "foto-libre"}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.url} alt={foto.alterno} loading="lazy" referrerPolicy="no-referrer" />
                    <span>{foto.autor}</span>
                    <span className="licencia">{foto.licencia}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {elegida !== null ? (
            <div className="elegida-detalle">
              <input type="hidden" name="url_fuente_imagen" value={elegida.urlFuente} />
              <p>
                Crédito: <strong>{elegida.credito}</strong> ·{" "}
                <a href={elegida.urlFuente} target="_blank" rel="noreferrer noopener">
                  ver el archivo y su licencia
                </a>
              </p>
              <label>
                Texto alternativo <span className="pista">(qué se ve en la foto)</span>
                <input
                  name="texto_alterno_imagen"
                  value={alterno}
                  onChange={(e) => setAlterno(e.target.value)}
                  maxLength={300}
                />
              </label>
              <p className="pista">
                En la portada va a decir «Foto de archivo · no es del hecho». Al guardar se vuelve a
                consultar Commons: el autor y la licencia salen de ahí, no de este formulario.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {origen === "medio" ? (
        <>
          <label>
            Enlace a la imagen <span className="pista">(solo https)</span>
            <input name="url_imagen" type="url" placeholder="https://..." />
          </label>
          <label>
            Crédito de la imagen
            <input name="credito_imagen" maxLength={200} placeholder="Fotografía: nombre / medio" />
          </label>
          <label>
            Texto alternativo
            <input
              name="texto_alterno_imagen"
              maxLength={300}
              placeholder="Qué se ve en la foto, para quien no puede verla"
            />
          </label>
        </>
      ) : null}

      <p className="pista">
        El crédito y el texto alternativo no son opcionales cuando hay foto, y la regla vive en la
        base de datos: publicar la imagen de alguien sin atribuirla, en una plataforma que argumenta
        sobre la procedencia, sería contradecirse en la portada.
      </p>
    </fieldset>
  );
}
