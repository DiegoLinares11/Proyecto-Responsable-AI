// ===========================================================================
// Validación de lo que devuelve el modelo
//
// Compartida entre los dos proveedores a propósito. El ADR 0005 promete que
// cambiar de proveedor no cambia el comportamiento de la defensa; si cada modo
// validara a su manera, esa promesa sería falsa y la diferencia aparecería
// justo donde peor se nota — en una corrida de red team que da distinto según
// cómo se levantó el servidor.
//
// En modo `api` el esquema lo obliga el servidor y esto es una segunda capa. En
// modo `suscripcion` no hay esquema del servidor y esto es la única. Misma
// función, dos papeles.
// ===========================================================================

import type {
  CategoriaDeIntencion,
  NivelDeConfianza,
  RespuestaDelModelo,
  VeredictoCapa1,
} from "../tipos.ts";

const CATEGORIAS: readonly CategoriaDeIntencion[] = [
  "consulta_noticias",
  "cortesia",
  "fuera_de_dominio",
  "intento_desvio",
  "contenido_dañino",
];

const CONFIANZAS: readonly NivelDeConfianza[] = ["alta", "media", "baja"];

/**
 * Valida la clasificación.
 *
 * Ante una categoría desconocida se elige `intento_desvio`, no
 * `consulta_noticias`. Es la opción segura: atiende la parte legítima y niega el
 * resto, así que equivocarse en esa dirección cuesta poco. Tratar lo
 * desconocido como consulta legítima sería lo contrario — un valor corrupto o
 * inventado se convertiría en vía libre.
 */
export function validarClasificacion(crudo: unknown): VeredictoCapa1 {
  const objeto = (crudo ?? {}) as Record<string, unknown>;
  const categoria = objeto["categoria"];
  const reconocida = CATEGORIAS.includes(categoria as CategoriaDeIntencion);

  return {
    categoria: reconocida ? (categoria as CategoriaDeIntencion) : "intento_desvio",
    parteLegitima: typeof objeto["parte_legitima"] === "string" ? objeto["parte_legitima"] : null,
    tareaAjena: typeof objeto["tarea_ajena"] === "string" ? objeto["tarea_ajena"] : null,
    razonamiento:
      typeof objeto["razonamiento"] === "string"
        ? objeto["razonamiento"]
        : reconocida
          ? "El clasificador no explicó su decisión."
          : `El clasificador devolvió una categoría desconocida (${String(categoria)}); ` +
            "se trata como intento de desvío por precaución.",
  };
}

/**
 * Valida la respuesta.
 *
 * Ante una confianza desconocida se elige `baja`, que es la que hace que la
 * interfaz avise en vez de presentar el resultado como firme. Y las citas que no
 * sean cadenas se descartan aquí, para que la capa 3 reciba una lista limpia y
 * su comprobación signifique lo que dice.
 */
export function validarRespuesta(crudo: unknown): RespuestaDelModelo {
  const objeto = (crudo ?? {}) as Record<string, unknown>;
  const citadas = objeto["noticias_citadas"];
  const confianza = objeto["confianza"];

  return {
    respuesta: typeof objeto["respuesta"] === "string" ? objeto["respuesta"] : "",
    noticias_citadas: Array.isArray(citadas)
      ? citadas.filter((c): c is string => typeof c === "string" && c.trim() !== "")
      : [],
    confianza: CONFIANZAS.includes(confianza as NivelDeConfianza)
      ? (confianza as NivelDeConfianza)
      : "baja",
  };
}
