// ===========================================================================
// La política de privacidad
//
// La exige Apple para probar la app fuera del equipo (TestFlight externo) y la
// pide cualquier tienda. Pero sobre todo tiene que decir lo que el código hace,
// ni más ni menos: cada afirmación de abajo sale de una tabla, una política de
// fila o una llamada concreta. Si el código cambia, esta página cambia con él.
// ===========================================================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad · Noticias Verificadas",
  description: "Qué datos guarda Noticias Verificadas, para qué, quién los ve y con quién se comparten.",
};

const CONTACTO = "lin221256@uvg.edu.gt";
const ACTUALIZADA = "13 de octubre de 2026";

const subtitulo = { fontSize: "1.05rem", marginTop: "2rem" } as const;

export default function Privacidad() {
  return (
    <article>
      <h2 style={{ fontSize: "1.3rem" }}>Política de privacidad</h2>
      <p>
        <em>Última actualización: {ACTUALIZADA}.</em>
      </p>

      <p>
        Noticias Verificadas es un proyecto académico del curso CC3106 Responsible AI de la
        Universidad del Valle de Guatemala. No vende datos, no muestra publicidad y no usa
        herramientas de analítica ni de rastreo de terceros. Se puede leer sin cuenta: la cuenta
        solo hace falta para el chat y para publicar o moderar.
      </p>

      <h3 style={subtitulo}>Qué guardamos y para qué</h3>

      <p>
        <strong>Tu cuenta, si entrás con Google.</strong> El nombre y el correo que Google comparte
        al iniciar sesión, y tu rol (lector, publicador, moderador o administrador). Sirven para
        identificarte y para saber qué podés hacer. Tu correo no lo ve ningún otro usuario. Tu
        nombre y tu rol sí los pueden ver otros usuarios con sesión.
      </p>

      <p>
        <strong>La ubicación que elegís.</strong> Un departamento o un país de una lista cerrada,
        para ordenar la portada. Con cuenta, se guarda en la base de datos y solo vos la podés ver.
        Sin cuenta, se queda en tu teléfono o tu navegador.
      </p>

      <p>
        <strong>El GPS, si tocás «Usar mi ubicación real».</strong> La app pide tu ubicación con
        precisión baja (en Android, solo la aproximada), calcula en tu dispositivo cuál es la
        cabecera departamental más cercana y te la sugiere. Las coordenadas no salen de tu teléfono y no se guardan en ningún
        lado. La ubicación que cuenta es la que elegís vos, no la del GPS.
      </p>

      <p>
        <strong>Qué noticias abrís, si tenés cuenta.</strong> Una marca por noticia abierta. Se usa
        para dos cosas: ordenar tu portada según las secciones que más leés en los últimos 30 días,
        y contar, sumando a todos los usuarios, cuánta interacción tiene cada noticia. Solo vos ves
        tus lecturas, y desde Perfil podés reiniciar tus intereses cuando quieras.
      </p>

      <p>
        <strong>Lo que le preguntás al chat.</strong> Tus mensajes y las respuestas del asistente
        se guardan en tu conversación, junto con datos técnicos de cada turno: la categoría que le
        asignó el filtro de seguridad, si se bloqueó, qué noticias citó y cuánto costó. Sirven para
        mostrarte el historial, para que el servicio no supere su tope de gasto y para comprobar que
        las defensas del chat funcionan. Dentro de la app, solo vos ves tu conversación. Lo que
        preguntás <strong>no</strong> se usa para ordenarte la portada: lo que alguien le pregunta a
        un asistente no es una preferencia que haya declarado.
      </p>

      <p>
        <strong>Si publicás o moderás.</strong> Las noticias que enviás y las decisiones que tomás,
        con su motivo, quedan registradas con tu cuenta en una bitácora de auditoría. Es lo que
        permite revisar después quién decidió qué.
      </p>

      <p>
        Las personas que mantienen el proyecto tienen acceso técnico a la base de datos y pueden
        revisar estos registros para corregir errores o investigar un abuso. Hoy los datos no se
        borran solos: se guardan mientras exista tu cuenta, salvo que pidas borrarlos.
      </p>

      <h3 style={subtitulo}>Con quién se comparte</h3>
      <ul>
        <li>
          <strong>Supabase</strong> guarda la base de datos y maneja el inicio de sesión.
        </li>
        <li>
          <strong>Google</strong> te identifica si elegís entrar con Google.
        </li>
        <li>
          <strong>OpenAI</strong> recibe cada pregunta al chat, el historial de esa conversación,
          el nombre de la ubicación que elegiste y las noticias necesarias para responderla, sin
          tu nombre ni tu correo. La app le pide que
          no guarde las respuestas. Según las condiciones de su API, OpenAI no usa estos datos para
          entrenar sus modelos y puede conservar registros hasta 30 días para detectar abusos.
        </li>
        <li>
          <strong>Vercel</strong> aloja el servidor y la versión web. Como cualquier servidor,
          registra datos técnicos de cada petición, como la dirección IP.
        </li>
        <li>
          <strong>Wikimedia Commons</strong>: algunas fotos de archivo se cargan directo desde sus
          servidores, así que tu dispositivo les pide la imagen.
        </li>
        <li>
          <strong>Apple</strong>: si instalás la app con TestFlight, Apple puede compartir con el
          equipo informes de fallos y de uso de la prueba, según sus propias condiciones.
        </li>
      </ul>

      <h3 style={subtitulo}>En tu dispositivo</h3>
      <p>
        La app guarda tu sesión y, si no tenés cuenta, la ubicación que elegiste. El portal web usa
        cookies solo para mantener tu sesión. No hay cookies de publicidad ni de seguimiento.
      </p>

      <h3 style={subtitulo}>Lo que podés pedir</h3>
      <p>
        Podés pedir una copia de tus datos, corregirlos o borrar tu cuenta con todo lo asociado:
        preferencias, lecturas y conversaciones. Escribí a{" "}
        <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>. Tu nombre lo podés corregir también desde
        tu cuenta de Google, y tus intereses los reiniciás desde Perfil sin pedírselo a nadie.
      </p>

      <h3 style={subtitulo}>Menores de edad</h3>
      <p>La app no está pensada para menores de 13 años.</p>

      <h3 style={subtitulo}>Cambios</h3>
      <p>
        Si cambia lo que la app guarda o con quién lo comparte, esta página cambia con ella y la
        fecha de arriba se actualiza.
      </p>
    </article>
  );
}
