// ===========================================================================
// El selector de proveedor (ADR 0005)
//
// Ningún módulo fuera de esta carpeta sabe cuál de los dos modos está activo.
// Esa es la razón de que exista el puerto: las cinco capas de defensa son lo que
// se evalúa, y no pueden depender de por dónde entra el modelo.
// ===========================================================================

import { ConfiguracionInvalida, type ModoLlm, type ProveedorLlm } from "./tipos.ts";
import { crearProveedorApi, type OpcionesProveedorApi } from "./proveedor-api.ts";
import {
  crearProveedorSuscripcion,
  MODELO_DE_SUSCRIPCION,
  type OpcionesProveedorSuscripcion,
} from "./proveedor-suscripcion.ts";

export type OpcionesDeSeleccion = {
  modo?: string | undefined;
  /** Para la guarda de producción. Por omisión sale de NODE_ENV y VERCEL_ENV. */
  esProduccion?: boolean;
  api?: OpcionesProveedorApi;
  suscripcion?: OpcionesProveedorSuscripcion;
};

const MODOS: readonly ModoLlm[] = ["suscripcion", "api"];

function detectarProduccion(): boolean {
  return (
    process.env["NODE_ENV"] === "production" ||
    process.env["VERCEL_ENV"] === "production" ||
    process.env["VERCEL_ENV"] === "preview"
  );
}

export function interpretarModo(valor: string | undefined): ModoLlm {
  const modo = (valor ?? "").trim().toLowerCase();

  if (modo === "") {
    throw new ConfiguracionInvalida(
      "Falta LLM_MODO. Poné `suscripcion` para desarrollar o `api` para desplegar y medir. " +
        "No hay valor por omisión a propósito: el modo decide de dónde sale el dinero.",
    );
  }

  if (!MODOS.includes(modo as ModoLlm)) {
    throw new ConfiguracionInvalida(
      `LLM_MODO no reconoce «${modo}». Los valores válidos son: ${MODOS.join(", ")}.`,
    );
  }

  return modo as ModoLlm;
}

/**
 * Arma el proveedor según el entorno.
 *
 * La guarda de producción es deliberadamente un error de arranque y no una
 * advertencia. Un despliegue que arranca en modo suscripción funcionaría —por un
 * rato, y contra la sesión de alguien— y ese es exactamente el fallo que no se
 * quiere: silencioso, y del lado de incumplir las condiciones de uso de la
 * herramienta. Mejor que no arranque.
 */
export function crearProveedor(opciones: OpcionesDeSeleccion = {}): ProveedorLlm {
  const modo = interpretarModo(opciones.modo ?? process.env["LLM_MODO"]);
  const esProduccion = opciones.esProduccion ?? detectarProduccion();

  if (modo === "suscripcion" && esProduccion) {
    throw new ConfiguracionInvalida(
      "LLM_MODO=suscripcion no se puede usar en un entorno desplegado. La suscripción personal " +
        "sirve para desarrollar y probar en local; una aplicación que atiende usuarios necesita " +
        "crédito de API. Poné LLM_MODO=api y ANTHROPIC_API_KEY. " +
        "Ver docs/adr/0005-proveedor-llm-conmutable.md.",
    );
  }

  const proveedor =
    modo === "api"
      ? crearProveedorApi(opciones.api ?? {})
      : crearProveedorSuscripcion(opciones.suscripcion ?? {});

  // Cinturón y tirantes: si alguna vez se agrega un proveedor nuevo y se olvida
  // marcarlo, la guarda de arriba no lo cubriría pero esta sí.
  if (esProduccion && !proveedor.aptoParaDespliegue) {
    throw new ConfiguracionInvalida(
      `El proveedor «${proveedor.nombre}» no está marcado como apto para despliegue.`,
    );
  }

  return proveedor;
}

export { crearProveedorApi, crearProveedorSuscripcion, MODELO_DE_SUSCRIPCION };
export { validarClasificacion, validarRespuesta } from "./validacion.ts";
export {
  calcularCosto,
  sumarCostos,
  ConfiguracionInvalida,
  COSTO_CERO,
  PRECIOS_POR_MILLON,
  type ModoLlm,
  type PeticionDeClasificacion,
  type PeticionDeRespuesta,
  type ProveedorLlm,
  type Respondido,
  type TurnoDeHistorial,
} from "./tipos.ts";
