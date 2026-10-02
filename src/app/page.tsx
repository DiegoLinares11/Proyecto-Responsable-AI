// ===========================================================================
// El feed
//
// Lo que distingue a esta pantalla de cualquier otro feed de noticias es el
// «¿por qué está aquí?»: cada posición trae el desglose de su relevancia con los
// números que la sustentan. Un ordenamiento que no se puede explicar es lo que
// este curso enseña a no construir (ADR 0003), y la forma de no construirlo es
// mostrarlo.
// ===========================================================================

import { Fragment } from "react";

import { leerFeed, type NoticiaDelFeed } from "../lib/consultas.ts";

export const dynamic = "force-dynamic";

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SelloDeVeracidad({ puntaje }: { puntaje: number | null }) {
  if (puntaje === null) {
    return <span className="sello aviso">sin evaluar</span>;
  }
  if (puntaje >= 75) {
    return <span className="sello">verificada · {puntaje}/100</span>;
  }
  return <span className="sello aviso">veracidad {puntaje}/100</span>;
}

function PorQueEstaAqui({ noticia }: { noticia: NoticiaDelFeed }) {
  const renglones: ReadonlyArray<readonly [string, number, string]> = [
    [
      "Interacciones en la plataforma",
      noticia.componentes.interacciones,
      "Reacciones, comentarios y lecturas, con rendimiento decreciente y ponderadas por la antigüedad de cada cuenta.",
    ],
    [
      "Reacciones de cuentas verificadas",
      noticia.componentes.verificadas,
      "Ponderadas por la autoridad de cada cuenta: una fuente acreditada pesa más que una recién creada.",
    ],
    [
      "Credibilidad de la fuente",
      noticia.componentes.fuente,
      noticia.credibilidadFuente === null
        ? "Esta fuente no está en el registro, así que no aporta credibilidad."
        : `${noticia.fuente} tiene ${noticia.credibilidadFuente} de 100 en el registro de fuentes.`,
    ],
    [
      "Veracidad",
      noticia.componentes.veracidad,
      "Resultado del canal de validación. Entra al cuadrado, para que raspar el umbral no valga casi lo mismo que estar sólidamente corroborado.",
    ],
  ];

  return (
    <details className="porque">
      <summary>¿Por qué está aquí? (relevancia {noticia.relevancia.toFixed(3)})</summary>
      <table>
        <tbody>
          {renglones.map(([concepto, valor, explicacion]) => (
            <Fragment key={concepto}>
              <tr>
                <td>{concepto}</td>
                <td className="valor">+{valor.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="explica" colSpan={2}>
                  {explicacion}
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: "0.6rem", color: "var(--tinta-suave)" }}>
        El total se divide por la antigüedad, para que lo viejo con mucho acumulado no se quede
        arriba para siempre. <a href="/como-funciona">La fórmula completa está acá.</a>
      </p>
    </details>
  );
}

export default async function Feed() {
  const noticias = await leerFeed();

  if (noticias.length === 0) {
    return (
      <p className="vacio">
        Todavía no hay noticias verificadas. Una noticia solo aparece acá cuando el canal de
        validación la dio por buena o cuando un moderador la aprobó.
      </p>
    );
  }

  return (
    <>
      {noticias.map((noticia) => (
        <article className="noticia" key={noticia.id}>
          <h2>
            <a href={`/noticia/${noticia.id}`}>{noticia.titulo}</a>
          </h2>
          <p className="resumen">{noticia.resumen}</p>
          <div className="meta">
            <SelloDeVeracidad puntaje={noticia.puntajeVeracidad} />
            <span>{noticia.fuente ?? "fuente no registrada"}</span>
            <span>{fecha(noticia.publicadaEn)}</span>
            {noticia.rafagaSospechosa ? (
              <span className="sello malo">tracción en revisión</span>
            ) : null}
          </div>
          <PorQueEstaAqui noticia={noticia} />
        </article>
      ))}
    </>
  );
}
