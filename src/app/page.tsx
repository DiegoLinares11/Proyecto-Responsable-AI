// ===========================================================================
// La redacción
//
// El portal no es una segunda portada. Los lectores leen en la app —en el
// teléfono o en la web—, que ordena para su ubicación y sus intereses y dice
// por qué cada noticia está donde está. Dos portadas con órdenes distintos
// confundían más de lo que mostraban.
//
// Acá trabaja quien publica, modera o administra: cada uno ve lo que su rol le
// permite. Esto decide QUÉ MOSTRAR; lo que cada uno PUEDE hacer lo deciden las
// políticas de fila.
// ===========================================================================

import { URL_DE_LA_APP } from "../lib/app.ts";
import { leerAlertasDeContenido, leerColaDeModeracion } from "../lib/consultas.ts";
import { perfilDelVisitante } from "../lib/supabase-servidor.ts";

export const dynamic = "force-dynamic";

function TarjetaDeTarea({
  href,
  titulo,
  texto,
  cifra,
}: {
  href: string;
  titulo: string;
  texto: string;
  cifra?: string;
}) {
  return (
    <a href={href} className="tarea">
      <span className="tarea-titulo">{titulo}</span>
      {cifra ? <span className="tarea-cifra">{cifra}</span> : null}
      <span className="tarea-texto">{texto}</span>
    </a>
  );
}

export default async function Redaccion() {
  const perfil = await perfilDelVisitante();

  const modera = perfil?.permisos.has("noticias_moderar") === true;
  const publica = perfil?.permisos.has("noticias_publicar") === true;
  const administra = perfil?.permisos.has("usuarios_administrar") === true;

  // Las cifras de moderación solo para quien modera: con otra sesión, las
  // políticas devolverían cero filas y la cifra mentiría.
  const [cola, alertas] = modera
    ? await Promise.all([leerColaDeModeracion(), leerAlertasDeContenido()])
    : [[], []];
  const alertasAbiertas = alertas.length;

  return (
    <article className="redaccion">
      <h2>La redacción</h2>
      <p className="entrada">
        Acá se publica, se modera y se administra. Las noticias se leen en la app, en el teléfono o en
        la web: ahí cada portada se ordena para la ubicación y los intereses de quien lee, y cada
        noticia dice por qué está donde está.
      </p>
      <p>
        <a className="boton-app" href={URL_DE_LA_APP}>
          Abrir la app de noticias ↗
        </a>
      </p>

      {perfil === null ? (
        <p className="aviso-redaccion">
          ¿Publicás, moderás o administrás? <a href="/entrar">Entrá</a> con tu cuenta.
        </p>
      ) : !publica && !modera && !administra ? (
        <p className="aviso-redaccion">
          Tu cuenta es <strong>{perfil.rol}</strong>: lee en la app. Para publicar o moderar, un
          administrador te da el permiso; nadie se lo asigna solo.
        </p>
      ) : (
        <div className="tareas">
          {publica ? (
            <TarjetaDeTarea
              href="/publicar"
              titulo="Publicar"
              texto="Mandá una noticia al canal de validación: cinco señales, sin IA, antes de que llegue a la app."
            />
          ) : null}
          {modera ? (
            <TarjetaDeTarea
              href="/moderacion"
              titulo="Moderación"
              cifra={`${cola.length} en revisión · ${alertasAbiertas} ${alertasAbiertas === 1 ? "alerta" : "alertas"}`}
              texto="Las noticias que el canal dejó en revisión, y las publicadas que intentaron manipular al chatbot."
            />
          ) : null}
          {administra ? (
            <TarjetaDeTarea
              href="/administracion"
              titulo="Administración"
              texto="Quién puede publicar y quién puede moderar, con un motivo que queda en la auditoría."
            />
          ) : null}
        </div>
      )}

      <p className="pie-redaccion">
        <a href="/como-funciona">Cómo se valida y cómo se ordena cada noticia</a>
      </p>
    </article>
  );
}
