// ===========================================================================
// La página que explica el método
//
// No es relleno: un sistema que ordena noticias y pone sellos de «verificada»
// tiene que poder explicarse a quien lo lee, no solo a quien lo programó. Esta
// pantalla es la cara pública de los ADR.
// ===========================================================================

import {
  MAXIMOS,
  UMBRAL_REVISION,
  UMBRAL_VERIFICADA,
} from "../../modules/validacion/index.ts";
import { PESOS_INICIALES } from "../../modules/ranking/index.ts";

export default function ComoFunciona() {
  return (
    <article>
      <h2 style={{ fontSize: "1.3rem" }}>¿Cómo funciona?</h2>

      <p>
        Dos cosas deciden lo que ves: si una noticia se publica, y en qué orden aparece. Ninguna de
        las dos la decide un modelo de lenguaje.
      </p>

      <h3 style={{ fontSize: "1.05rem", marginTop: "2rem" }}>Si se publica</h3>
      <p>
        Cada noticia pasa por cinco señales independientes. El puntaje de veracidad es la suma de
        lo que aporta cada una, sobre 100:
      </p>
      <ul>
        <li>Credibilidad de la fuente, hasta {MAXIMOS.credibilidad_fuente} puntos.</li>
        <li>Que la URL exista y su titular coincida, hasta {MAXIMOS.url_verificable}.</li>
        <li>Cuántos medios independientes cubren el mismo hecho, hasta {MAXIMOS.corroboracion}.</li>
        <li>Coherencia interna de la nota, hasta {MAXIMOS.coherencia}.</li>
        <li>
          Desmentidos conocidos. Esta no suma: <strong>veta</strong>. Una afirmación que una
          organización de verificación ya calificó como falsa no se publica, por buena que sea la
          fuente.
        </li>
      </ul>
      <p>
        De {UMBRAL_VERIFICADA} para arriba se publica. Entre {UMBRAL_REVISION} y{" "}
        {UMBRAL_VERIFICADA} la lee una persona antes. Por debajo no se publica, y el autor ve el
        desglose para corregir.
      </p>
      <p>
        <strong>La regla que no se negocia:</strong> nada por debajo del umbral se publica
        automáticamente, y una señal que no se pudo comprobar nunca se asume favorable. Si no se
        pudo averiguar, decide una persona.
      </p>

      <h3 style={{ fontSize: "1.05rem", marginTop: "2rem" }}>En qué orden aparece</h3>
      <p>Una fórmula, con estos pesos:</p>
      <ul>
        <li>Interacciones en la plataforma, peso {PESOS_INICIALES.w_interaccion}.</li>
        <li>Reacciones de cuentas verificadas, peso {PESOS_INICIALES.w_verificadas}.</li>
        <li>Credibilidad de la fuente, peso {PESOS_INICIALES.w_fuente}.</li>
        <li>Veracidad, peso {PESOS_INICIALES.w_veracidad}, y entra al cuadrado.</li>
      </ul>
      <p>
        El total se divide por la antigüedad elevada a {PESOS_INICIALES.gravedad}, para que lo
        viejo con mucho acumulado no se quede arriba para siempre. Cada noticia del feed trae un
        «¿por qué está aquí?» con sus números.
      </p>
      <p>
        Las interacciones se ponderan por la antigüedad de la cuenta que las hizo: una cuenta
        creada hoy aporta casi nada. Es la defensa más barata contra una granja de cuentas, porque
        el tiempo no se compra.
      </p>

      <h3 style={{ fontSize: "1.05rem", marginTop: "2rem" }}>Lo que este sistema no hace</h3>
      <ul>
        <li>
          No decide si una noticia es cierta. Mide señales a su alrededor y escala a una persona
          cuando no alcanzan.
        </li>
        <li>
          No borra nada. Marca, explica y pasa a revisión humana. La decisión editorial la toma
          alguien.
        </li>
        <li>
          El registro de credibilidad de fuentes lo arma el equipo a mano.{" "}
          <strong>Es una posición editorial, no un hecho medido</strong>, y su punto ciego conocido
          son los medios locales guatemaltecos que ningún índice internacional lista.
        </li>
      </ul>

      <h3 style={{ fontSize: "1.05rem", marginTop: "2rem" }}>El chatbot</h3>
      <p>
        Responde solo sobre las noticias publicadas acá. No escribe código, no hace tareas y no
        opina en nombre de la plataforma. Si le pedís algo de eso, te lo dice. Está rodeado de
        cinco capas de defensa y cada respuesta se comprueba contra la base antes de mostrarse: si
        cita una noticia que no existe, se descarta.
      </p>

      <p style={{ color: "var(--tinta-suave)", fontSize: "0.875rem", marginTop: "2rem" }}>
        Proyecto de CC3106 Responsible AI, Universidad del Valle de Guatemala.
      </p>
    </article>
  );
}
