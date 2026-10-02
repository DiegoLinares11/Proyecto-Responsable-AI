// ===========================================================================
// La noticia, con su desglose de validación
//
// Esta pantalla es la que cumple la promesa del proyecto: el puntaje de
// veracidad **nunca se muestra solo**, siempre con las cinco señales y lo que
// aportó cada una. Un publicador al que le rechazan una nota tiene derecho a ver
// por qué, y un lector tiene derecho a saber en qué se basa el sello.
// ===========================================================================

import { notFound } from "next/navigation";

import { leerNoticia, type SenalDeValidacion } from "../../../lib/consultas.ts";

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

  return (
    <div className="senal">
      <h3>
        <span>
          {NOMBRES[senal.senal] ?? senal.senal}
          {senal.disponible ? null : (
            <span className="sello aviso" style={{ marginLeft: "0.5rem" }}>
              no se pudo comprobar
            </span>
          )}
          {veto ? (
            <span className="sello malo" style={{ marginLeft: "0.5rem" }}>
              veto
            </span>
          ) : null}
        </span>
        <span style={{ color: "var(--tinta-suave)", whiteSpace: "nowrap" }}>
          {maximo === 0 ? "—" : `${senal.aporte.toFixed(2)} de ${maximo}`}
        </span>
      </h3>
      <p>{explicacion}</p>
      {(() => {
        const dominios = senal.detalle["dominios_que_corroboran"];
        if (!Array.isArray(dominios) || dominios.length === 0) return null;
        return (
          <p style={{ marginTop: "0.4rem" }}>
            Medios que cubren el mismo hecho: {(dominios as string[]).join(", ")}
          </p>
        );
      })()}
    </div>
  );
}

export default async function Noticia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const noticia = await leerNoticia(id);

  if (noticia === null) notFound();

  return (
    <article>
      <h2 style={{ fontSize: "1.4rem", lineHeight: 1.3, margin: "0 0 0.75rem" }}>
        {noticia.titulo}
      </h2>

      <div className="meta" style={{ marginBottom: "1.25rem" }}>
        <span className="sello">
          verificada · {noticia.puntajeVeracidad ?? "?"}/100
        </span>
        <span>{noticia.fuente ?? "fuente no registrada"}</span>
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

      <p style={{ fontWeight: 500 }}>{noticia.resumen}</p>
      <div style={{ whiteSpace: "pre-wrap", color: "var(--tinta-suave)" }}>{noticia.cuerpo}</div>

      <h3 style={{ marginTop: "2.5rem", fontSize: "1.05rem" }}>
        Cómo se validó esta noticia
      </h3>
      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem", marginTop: 0 }}>
        Cinco señales independientes, todas deterministas y sin modelo de lenguaje. El puntaje de
        veracidad es la suma de lo que aportó cada una.{" "}
        <a href="/como-funciona">Por qué se hace así.</a>
      </p>

      {noticia.senales.length === 0 ? (
        <p className="vacio">
          Esta noticia todavía no tiene desglose guardado. Las que se publicaron antes de que el
          canal de validación estuviera conectado no lo tienen; se corrige volviéndolas a validar.
        </p>
      ) : (
        noticia.senales.map((senal) => <Senal senal={senal} key={senal.senal} />)
      )}
    </article>
  );
}
