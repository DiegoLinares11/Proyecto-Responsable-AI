// ===========================================================================
// La cola de moderación
//
// Es donde aterriza todo lo que el sistema no se animó a decidir solo: las
// noticias que quedaron entre los umbrales, las que tuvieron una señal que no se
// pudo comprobar, y las que el ranking marcó por tracción sospechosa.
//
// La lista la limita la política `noticias_lectura`, no un `if` de acá: para
// quien no tenga `noticias_moderar`, la consulta vuelve vacía.
// ===========================================================================

import { perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { leerColaDeModeracion } from "../../lib/consultas.ts";
import { FilaDeModeracion } from "./fila.tsx";

export const dynamic = "force-dynamic";

export default async function Moderacion() {
  const perfil = await perfilDelVisitante();

  if (perfil === null) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Moderación</h2>
        <p>
          Hay que <a href="/entrar">entrar</a>.
        </p>
      </article>
    );
  }

  if (!perfil.permisos.has("noticias_moderar")) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Moderación</h2>
        <p>
          Tu cuenta es <strong>{perfil.rol}</strong> y no tiene el permiso{" "}
          <code>noticias_moderar</code>.
        </p>
      </article>
    );
  }

  const cola = await leerColaDeModeracion();

  return (
    <article>
      <h2 style={{ fontSize: "1.2rem" }}>Cola de moderación</h2>
      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem" }}>
        Lo que el canal de validación no se animó a decidir solo. Cada decisión necesita un motivo
        escrito: una decisión editorial sin explicación no se puede auditar después, y la
        auditoría es la mitad del punto de tener moderación humana.
      </p>

      {cola.length === 0 ? (
        <p className="vacio">No hay nada esperando revisión.</p>
      ) : (
        cola.map((noticia) => <FilaDeModeracion noticia={noticia} key={noticia.id} />)
      )}
    </article>
  );
}
