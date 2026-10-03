// ===========================================================================
// La portada
//
// Lo que distingue a esta pantalla de cualquier otra portada de noticias es el
// «¿por qué está aquí?»: cada posición trae el desglose de su relevancia con los
// números que la sustentan. Un ordenamiento que no se puede explicar es lo que
// este curso enseña a no construir (ADR 0003), y la forma de no construirlo es
// mostrarlo.
//
// La jerarquía —una nota principal grande, una rejilla de destacadas, un riel de
// titulares— no es decoración: es la lectura en diagonal que hace cualquier
// lector de diario, y el orden lo sigue poniendo la fórmula, no un editor.
// ===========================================================================

import { Fragment } from "react";

import { leerFeed, type NoticiaDelFeed } from "../lib/consultas.ts";
import { interpretarSeccion, NOMBRE_DE_SECCION } from "../lib/secciones.ts";

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

/**
 * La foto.
 *
 * `referrerPolicy="no-referrer"` no es un detalle: una imagen remota la pide el
 * navegador del lector, así que el servidor del medio ve su IP y, si no se lo
 * impide, también QUÉ nota está leyendo. Lo primero no se puede evitar sin un
 * proxy propio; lo segundo sí, y cuesta un atributo.
 */
function Foto({ imagen }: { imagen: NonNullable<NoticiaDelFeed["imagen"]> }) {
  return (
    <figure className="foto">
      <img
        src={imagen.url}
        alt={imagen.alterno}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <figcaption>{imagen.credito}</figcaption>
    </figure>
  );
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
      <p className="cierre">
        El total se divide por la antigüedad, para que lo viejo con mucho acumulado no se quede
        arriba para siempre. <a href="/como-funciona">La fórmula completa está acá.</a>
      </p>
    </details>
  );
}

function Nota({ noticia, principal = false }: { noticia: NoticiaDelFeed; principal?: boolean }) {
  return (
    <article className={principal ? "nota principal" : "nota"}>
      {noticia.imagen !== null ? <Foto imagen={noticia.imagen} /> : null}
      <div className="texto">
        <span className="antetitulo">{NOMBRE_DE_SECCION[noticia.seccion]}</span>
        <h2>
          <a href={`/noticia/${noticia.id}`}>{noticia.titulo}</a>
        </h2>
        <p className="resumen">{noticia.resumen}</p>
        <div className="meta">
          <SelloDeVeracidad puntaje={noticia.puntajeVeracidad} />
          <span className="fuente">{noticia.fuente ?? "fuente no registrada"}</span>
          <span>{fecha(noticia.publicadaEn)}</span>
          {noticia.rafagaSospechosa ? (
            <span className="sello malo">tracción en revisión</span>
          ) : null}
        </div>
        <PorQueEstaAqui noticia={noticia} />
      </div>
    </article>
  );
}

export default async function Portada({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const seccion = interpretarSeccion((await searchParams)["seccion"]);
  const noticias = await leerFeed({ seccion });

  // El corte es por posición en el ranking, no por criterio editorial. Quien
  // decide qué va arriba sigue siendo la fórmula.
  const [principal, ...resto] = noticias;

  if (principal === undefined) {
    return (
      <p className="vacio">
        {seccion === null ? (
          <>
            Todavía no hay noticias verificadas. Una noticia solo aparece acá cuando el canal de
            validación la dio por buena o cuando un moderador la aprobó.
          </>
        ) : (
          <>
            No hay noticias verificadas en {NOMBRE_DE_SECCION[seccion]}.{" "}
            <a href="/">Ver la portada completa.</a>
          </>
        )}
      </p>
    );
  }

  const destacadas = resto.slice(0, 4);
  const titulares = resto.slice(4);

  return (
    <div className="portada">
      <div>
        {seccion !== null ? (
          <p className="meta" style={{ marginBottom: "1rem" }}>
            <span className="antetitulo" style={{ marginBottom: 0 }}>
              {NOMBRE_DE_SECCION[seccion]}
            </span>
            <a href="/">Ver la portada completa</a>
          </p>
        ) : null}
        <Nota noticia={principal} principal />
        {destacadas.length > 0 ? (
          <div className="rejilla">
            {destacadas.map((noticia) => (
              <Nota key={noticia.id} noticia={noticia} />
            ))}
          </div>
        ) : null}
      </div>

      <aside className="riel">
        {titulares.length > 0 ? (
          <section>
            <h2>Más titulares</h2>
            <ol className="titulares">
              {titulares.map((noticia) => (
                <li key={noticia.id}>
                  <a href={`/noticia/${noticia.id}`}>{noticia.titulo}</a>
                  <span className="pie">
                    {NOMBRE_DE_SECCION[noticia.seccion]} · {noticia.fuente ?? "sin registrar"}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="metodo">
          <h2>Cómo se ordena</h2>
          <p>
            El orden no lo decide un editor ni un modelo. Sale de una fórmula con cuatro
            componentes, dividida por la antigüedad de la nota.
          </p>
          <p>
            Cada titular trae su desglose: abrí <strong>¿Por qué está aquí?</strong> y vas a ver
            los números exactos que lo pusieron en esa posición.
          </p>
          <p>
            <a href="/como-funciona">La fórmula completa, con sus pesos y sus sesgos conocidos.</a>
          </p>
        </section>
      </aside>
    </div>
  );
}
