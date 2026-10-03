// ===========================================================================
// La noticia, con su desglose de validación
//
// Esta pantalla es la que cumple la promesa del proyecto: el puntaje de
// veracidad **nunca se muestra solo**, siempre con las cinco señales y lo que
// aportó cada una. Un publicador al que le rechazan una nota tiene derecho a ver
// por qué, y un lector tiene derecho a saber en qué se basa el sello.
//
// El desglose va en un bloque aparte, con su propio encabezado y su propio
// marco, y no mezclado con el texto. Es información sobre la noticia, no la
// noticia: confundir las dos cosas en la misma columna es lo que hace que nadie
// lea ninguna de las dos.
// ===========================================================================

import { notFound } from "next/navigation";

import { leerNoticia, type SenalDeValidacion } from "../../../lib/consultas.ts";
import { NOMBRE_DE_SECCION } from "../../../lib/secciones.ts";

export const dynamic = "force-dynamic";

const NOMBRES: Readonly<Record<string, string>> = {
  credibilidad_fuente: "Credibilidad de la fuente",
  url_verificable: "La URL existe y dice lo que dice",
  corroboracion: "Corroboración independiente",
  desmentido: "Desmentidos conocidos",
  coherencia: "Coherencia interna",
};

function Senal({ senal }: { senal: SenalDeValidacion }) {
  const maximo = Number(senal.detalle["maximo"] ?? 0);
  const explicacion = String(senal.detalle["explicacion"] ?? "");
  const veto = senal.detalle["veto"] === true;
  const dominios = senal.detalle["dominios_que_corroboran"];

  return (
    <div className="senal">
      <h3>
        <span>
          {NOMBRES[senal.senal] ?? senal.senal}
          {senal.disponible ? null : <span className="sello aviso">no se pudo comprobar</span>}
          {veto ? <span className="sello malo">veto</span> : null}
        </span>
        <span className="aporte">{maximo === 0 ? "—" : `${senal.aporte.toFixed(2)} de ${maximo}`}</span>
      </h3>
      <p>{explicacion}</p>
      {Array.isArray(dominios) && dominios.length > 0 ? (
        <p className="corroboran">
          Medios que cubren el mismo hecho: {(dominios as string[]).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export default async function Noticia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const noticia = await leerNoticia(id);

  if (noticia === null) notFound();

  // El cuerpo se parte en párrafos. Un muro de texto corrido es ilegible, y
  // `pre-wrap` sobre una sola cadena era exactamente eso.
  const parrafos = noticia.cuerpo.split(/\n{2,}/).filter((p) => p.trim() !== "");

  return (
    <div className="lectura">
      <article className="nota-completa">
        <span className="antetitulo">{NOMBRE_DE_SECCION[noticia.seccion]}</span>
        <h1>{noticia.titulo}</h1>
        <p className="entradilla">{noticia.resumen}</p>

        <div className="firma">
          <span className="sello">verificada · {noticia.puntajeVeracidad ?? "?"}/100</span>
          <span className="fuente">{noticia.fuente ?? "fuente no registrada"}</span>
          <span>
            {new Date(noticia.publicadaEn).toLocaleString("es-GT", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </span>
          {noticia.urlOriginal === null ? null : (
            <a href={noticia.urlOriginal} rel="noreferrer noopener nofollow" target="_blank">
              Ver el artículo original
            </a>
          )}
        </div>

        {noticia.imagen === null ? null : (
          <figure className="foto">
            <img
              src={noticia.imagen.url}
              alt={noticia.imagen.alterno}
              decoding="async"
              referrerPolicy="no-referrer"
            />
            <figcaption>{noticia.imagen.credito}</figcaption>
          </figure>
        )}

        <div className="cuerpo">
          {parrafos.map((parrafo, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <p key={i}>{parrafo}</p>
          ))}
        </div>
      </article>

      <section className="ficha">
        <h2>Cómo se validó esta noticia</h2>
        <p className="intro">
          Cinco señales independientes, todas deterministas y sin modelo de lenguaje. El puntaje de
          veracidad es la suma de lo que aportó cada una.{" "}
          <a href="/como-funciona">Por qué se hace así.</a>
        </p>

        {noticia.senales.length === 0 ? (
          // El mensaje nombra las dos razones reales. La anterior solo mencionaba una
          // y dejaba entender que el puntaje de arriba venía igual de una corrida
          // del canal, que es justo lo que esta pantalla existe para no hacer.
          <p className="vacio">
            Esta noticia no tiene desglose guardado, así que <strong>el puntaje de arriba viene del
            dato y no de una corrida del canal</strong>. Les pasa a las noticias sembradas como
            demostración y a las que se publicaron antes de que el canal estuviera conectado. Se
            corrige volviéndolas a validar.
          </p>
        ) : (
          noticia.senales.map((senal) => <Senal senal={senal} key={senal.senal} />)
        )}
      </section>
    </div>
  );
}
