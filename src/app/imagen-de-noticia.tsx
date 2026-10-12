// ===========================================================================
// La imagen de una noticia, con su origen a la vista (R-10)
//
// El enunciado pide que una imagen hecha con IA no se confunda con una foto
// real. Lo mismo vale para una foto de archivo: la de «incendio forestal» casi
// nunca es del incendio de la nota. Por eso cada imagen dice de dónde sale, y
// la noticia sin foto lleva una ilustración que no puede pasar por fotografía.
// ===========================================================================

import { NOMBRE_DE_SECCION } from "../lib/secciones.ts";
import type { NoticiaDelFeed } from "../lib/consultas.ts";

const ROTULO_DE_ORIGEN = {
  medio: "Foto del medio",
  licencia_libre: "Foto de archivo · no es del hecho",
  generada_ia: "Generada por IA · no es una fotografía",
} as const;

/** La sección y el titular, compuestos. Sin IA, sin costo, sin archivo. */
export function Ilustracion({ seccion, titulo }: { seccion: NoticiaDelFeed["seccion"]; titulo: string }) {
  const nombre = NOMBRE_DE_SECCION[seccion];
  return (
    <figure className="ilustracion" role="img" aria-label={`Ilustración de ${nombre}, no es una fotografía`}>
      <span className="rotulo">{nombre.toUpperCase()}</span>
      <span className="titular">{titulo}</span>
      <span className="etiqueta">ILUSTRACIÓN · NO ES UNA FOTOGRAFÍA</span>
    </figure>
  );
}

/**
 * `referrerPolicy="no-referrer"` no es un detalle: una imagen remota la pide el
 * navegador del lector, así que el servidor del medio ve su IP y, si no se lo
 * impide, también QUÉ nota está leyendo. Lo primero no se puede evitar sin un
 * proxy propio; lo segundo sí, y cuesta un atributo.
 */
export function ImagenDeNoticia({
  noticia,
  carga = "lazy",
}: {
  noticia: Pick<NoticiaDelFeed, "imagen" | "seccion" | "titulo">;
  carga?: "lazy" | "eager";
}) {
  const imagen = noticia.imagen;
  if (imagen === null) return <Ilustracion seccion={noticia.seccion} titulo={noticia.titulo} />;

  return (
    <figure className={imagen.origen === "generada_ia" ? "foto con-aviso" : "foto"}>
      <img src={imagen.url} alt={imagen.alterno} loading={carga} decoding="async" referrerPolicy="no-referrer" />
      {imagen.origen === "generada_ia" ? (
        <span className="sobre-imagen">Ilustración generada por IA — no es una fotografía del hecho</span>
      ) : null}
      <figcaption>
        {imagen.origen !== null ? (
          <span className={imagen.origen === "medio" ? "origen" : "origen aviso"}>{ROTULO_DE_ORIGEN[imagen.origen]}</span>
        ) : null}{" "}
        {imagen.credito}
        {imagen.origen === "licencia_libre" && imagen.urlFuente !== null ? (
          <>
            {" · "}
            <a href={imagen.urlFuente} target="_blank" rel="noreferrer noopener">
              licencia
            </a>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
