// ===========================================================================
// El panel del publicador
//
// Esta pantalla no comprueba permisos para decidir si deja publicar: solo decide
// QUÉ MOSTRAR. Si alguien sin el permiso llegara igual al formulario y lo
// enviara, la política de fila lo rechazaría en el motor. Esconder un botón no
// es un control de seguridad; que el `insert` falle, sí.
// ===========================================================================

import { perfilDelVisitante } from "../../lib/supabase-servidor.ts";
import { leerMisBorradores } from "../../lib/consultas.ts";
import { FormularioDePublicacion } from "./formulario.tsx";

export const dynamic = "force-dynamic";

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "borrador", clase: "aviso" },
  en_revision: { texto: "en revisión", clase: "aviso" },
  no_verificable: { texto: "no verificable", clase: "malo" },
};

export default async function Publicar() {
  const perfil = await perfilDelVisitante();

  if (perfil === null) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Publicar</h2>
        <p>
          Hay que <a href="/entrar">entrar</a> para publicar una noticia.
        </p>
      </article>
    );
  }

  if (!perfil.permisos.has("noticias_publicar")) {
    return (
      <article>
        <h2 style={{ fontSize: "1.2rem" }}>Publicar</h2>
        <p>
          Tu cuenta es <strong>{perfil.rol}</strong> y no tiene el permiso{" "}
          <code>noticias_publicar</code>.
        </p>
        <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem" }}>
          Los permisos los reparte un administrador. Nadie se los asigna solo, ni siquiera
          llamando a la API directamente: la política de fila lo impide en el motor de base de
          datos.
        </p>
      </article>
    );
  }

  const mios = await leerMisBorradores();

  return (
    <article>
      <h2 style={{ fontSize: "1.2rem" }}>Publicar una noticia</h2>
      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem" }}>
        Al enviarla corren las cinco señales de validación. Según el resultado se publica, pasa a
        revisión humana o vuelve con el desglose para que la corrijas.{" "}
        <strong>Vos no la aprobás</strong>: eso lo decide el canal o un moderador.
      </p>

      <FormularioDePublicacion />

      {mios.length === 0 ? null : (
        <>
          <h3 style={{ fontSize: "1.05rem", marginTop: "2.5rem" }}>Tus noticias sin publicar</h3>
          {mios.map((noticia) => {
            const sello = ESTADOS[noticia.estado] ?? { texto: noticia.estado, clase: "aviso" };
            return (
              <div className="fila-cola" key={noticia.id}>
                <h3>
                  <a href={`/noticia/${noticia.id}`}>{noticia.titulo}</a>
                </h3>
                <div className="meta">
                  <span className={`sello ${sello.clase}`}>{sello.texto}</span>
                  {noticia.puntajeVeracidad === null ? null : (
                    <span>veracidad {noticia.puntajeVeracidad}/100</span>
                  )}
                  <span>{new Date(noticia.creadoEn).toLocaleDateString("es-GT")}</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </article>
  );
}
