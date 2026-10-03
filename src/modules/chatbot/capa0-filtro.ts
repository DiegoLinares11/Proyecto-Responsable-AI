// ===========================================================================
// Capa 0 — Determinista, antes de gastar un token
//
// Lo importante de esta capa es saber qué NO es: **no es la frontera de
// seguridad**. Un detector de patrones se evade reformulando, y el ataque que
// ordenó el diseño no contiene ninguna palabra prohibida.
//
// Está para dos cosas distintas, y conviene no mezclarlas:
//
//   · BLOQUEAR el abuso barato y masivo, que no requiere entender nada:
//     mensajes vacíos, mensajes de cien mil caracteres, y usuarios que ya
//     gastaron su cupo del día. Esto sí corta, porque el criterio es objetivo y
//     no se equivoca.
//
//   · REGISTRAR señales. Los patrones conocidos se anotan y viajan con el turno
//     hasta la bitácora y hasta la capa 1, pero NO bloquean. Un filtro de
//     palabras que bloquea produce más falsos positivos que seguridad: «cómo
//     implementa el gobierno el nuevo impuesto» tiene la palabra «implementa» y
//     es una pregunta perfectamente legítima sobre una noticia.
//
// Esa separación es la que hace que la capa aporte sin estorbar.
// ===========================================================================

import {
  MAXIMO_DE_CARACTERES,
  type Sospecha,
  type VeredictoCapa0,
} from "./tipos.ts";

type Patron = {
  clave: string;
  expresion: RegExp;
  descripcion: string;
  /** Si se evalúa sobre el texto normalizado o sobre el original. */
  sobre?: "normalizado" | "original";
};

/**
 * Se compara sobre el texto SIN ACENTOS.
 *
 * Escribir los patrones con acentos opcionales uno por uno es una fuente
 * silenciosa de agujeros, y en español de Guatemala más: el voseo mueve el
 * acento de sitio. «Actúa como» y «Actuá como» son la misma frase y un patrón
 * escrito con `act[uú]a` atrapa la primera y deja pasar la segunda — que es
 * justamente la forma que alguien de aquí escribiría. Normalizar primero cierra
 * toda esa familia de evasiones de una vez.
 */
const PATRONES: readonly Patron[] = [
  {
    clave: "orden_de_ignorar",
    expresion:
      /\b(ignor\w*|olvid\w*|descart\w*|obvi\w*)\b[^.]{0,40}\b(instruccion|indicacion|regla|orden|anterior|previo|sistema|prompt)/,
    descripcion: "Fórmula de inyección directa: pedir que se ignoren las instrucciones.",
  },
  {
    clave: "peticion_del_sistema",
    expresion:
      /\b(prompt del sistema|system prompt|tus instrucciones|tu configuracion|repet\w* todo lo que|que te dijeron|tus reglas)\b/,
    descripcion: "Intento de extraer el prompt del sistema.",
  },
  {
    clave: "juego_de_roles",
    expresion:
      /\b(actu[aá]\w* como|hace de cuenta|haz de cuenta|fing\w+ que|pretend\w* ser|a partir de ahora (sos|eres)|modo desarrollador|sin restricciones|jailbreak|\bdan\b)/,
    descripcion: "Intento de reasignar el rol del asistente.",
  },
  {
    // Requiere el verbo Y un sustantivo de programación cerca. «Implementa» a
    // secas aparece en preguntas legítimas sobre política pública —«¿cómo
    // implementa el gobierno el nuevo impuesto?»— y marcarlas llenaría la
    // bitácora de ruido justo donde hay que poder leerla.
    clave: "tarea_de_programacion",
    expresion:
      /\b(implement\w*|program\w*|escrib\w*|cod\w*|hace?me|hazme|dame)\b[^.]{0,30}\b(funcion|clase|metodo|script|codigo|algoritmo|array|struct|bucle|linked ?list|lista enlazada|arbol binario)\b/,
    descripcion: "Pedido de escribir código, que está fuera del dominio.",
  },
  {
    clave: "lenguaje_de_programacion",
    expresion: /\b(en|de) (java|python|javascript|typescript|c\+\+|c#|php|rust|go)\b/,
    descripcion: "Mención de un lenguaje de programación como destino de un pedido.",
  },
  {
    clave: "marcadores_de_conversacion",
    expresion: /(^|\n)\s*(system|assistant|asistente|usuario|user|human)\s*[:>]/,
    descripcion: "Marcadores de turno, para hacerse pasar por el sistema o por el asistente.",
  },
  {
    clave: "anzuelo_emocional",
    expresion:
      /\b(me siento mal|estoy deprimid\w*|me har[ií]?a sentir (bien|mejor)|te lo ruego|es urgente para mi|me vas a salvar)\b/,
    descripcion:
      "Apelación emocional. No es un ataque por sí sola, pero acompaña a los pedidos que buscan complacencia.",
  },
  {
    // Sobre el texto ORIGINAL: normalizar destruye el base64, que distingue
    // mayúsculas de minúsculas.
    clave: "bloque_codificado",
    expresion: /[A-Za-z0-9+/]{60,}={0,2}/,
    descripcion: "Bloque largo que parece base64: instrucciones escondidas tras una codificación.",
    sobre: "original",
  },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Lo que se deja de margen sobre los $20: con $18 de tope quedan dos dólares
 * para medir en modo api —una corrida de red team cuesta alrededor de uno— y
 * para los turnos que estén en vuelo cuando se cruza la línea.
 */
export const TOPE_GASTO_USD_POR_OMISION = 18;

export type OpcionesCapa0 = {
  maximoDeCaracteres?: number;
  /** Cupo diario por usuario. Protege el presupuesto, no la seguridad. */
  topeDiarioPorUsuario?: number;
  /**
   * Tope de gasto real de API del proyecto entero, en dólares. Al llegar, el
   * chatbot se apaga para todos. Protege el presupuesto, no la seguridad.
   */
  topeGastoUsd?: number;
};

export type EntradaCapa0 = {
  mensaje: string;
  /** Cuántos mensajes lleva hoy este usuario. */
  mensajesDeHoy: number;
  /** Cuánto lleva gastado el proyecto en la API, en dólares. */
  gastoAcumuladoUsd: number;
};

export function filtrarEntrada(
  entrada: EntradaCapa0,
  opciones: OpcionesCapa0 = {},
): VeredictoCapa0 {
  const maximo = opciones.maximoDeCaracteres ?? MAXIMO_DE_CARACTERES;
  const tope = opciones.topeDiarioPorUsuario ?? 40;
  const topeGasto = opciones.topeGastoUsd ?? TOPE_GASTO_USD_POR_OMISION;

  const mensaje = entrada.mensaje.trim();

  if (mensaje === "") {
    return { permitido: false, motivo: "El mensaje está vacío.", sospechas: [] };
  }

  if (mensaje.length > maximo) {
    return {
      permitido: false,
      motivo:
        `El mensaje tiene ${mensaje.length} caracteres y el tope son ${maximo}. ` +
        "Un mensaje enorme cuesta dinero aunque se rechace después.",
      sospechas: [],
    };
  }

  // Antes que el cupo por usuario porque es más general: si el proyecto ya no
  // tiene presupuesto, a nadie le sirve saber cuántos mensajes le quedaban.
  //
  // Un gasto que no es un número —una lectura rota— cuenta como agotado. Falla
  // cerrado: lo contrario es un tope que se abre justo cuando no sabe nada.
  //
  // El mensaje no dice cuánto se gastó. Ese número no lo puede leer ningún
  // usuario en la base (sección 12 de la suite de RLS), y repetirlo acá sería
  // filtrarlo por la puerta de al lado.
  if (!Number.isFinite(entrada.gastoAcumuladoUsd) || entrada.gastoAcumuladoUsd >= topeGasto) {
    return {
      permitido: false,
      motivo:
        "El asistente alcanzó el tope de gasto del proyecto y se apagó solo, antes de " +
        "agotar el crédito. Las noticias y su desglose siguen disponibles en el feed.",
      sospechas: [],
    };
  }

  if (entrada.mensajesDeHoy >= tope) {
    return {
      permitido: false,
      motivo:
        `Ya se usaron ${entrada.mensajesDeHoy} mensajes hoy y el tope es ${tope}. ` +
        "El cupo se renueva mañana.",
      sospechas: [],
    };
  }

  // De aquí para abajo, el turno SIGUE. Lo que se encuentre se anota.
  const normalizado = normalizar(mensaje);
  const sospechas: Sospecha[] = [];

  for (const patron of PATRONES) {
    const contra = patron.sobre === "original" ? mensaje : normalizado;
    if (patron.expresion.test(contra)) {
      sospechas.push({ clave: patron.clave, descripcion: patron.descripcion });
    }
  }

  return { permitido: true, motivo: "", sospechas };
}

/** Las claves de patrón que existen. Para que las pruebas no se inventen una. */
export const CLAVES_DE_PATRON: readonly string[] = PATRONES.map((p) => p.clave);
