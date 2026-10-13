// ===========================================================================
// El puerto del modelo (ADR 0005)
//
// Tres implementaciones y una variable de entorno que elige:
//
//   LLM_MODO=suscripcion  ->  Claude Agent SDK contra la sesión local. Para
//                             desarrollar sin consumir crédito.
//   LLM_MODO=api          ->  SDK de Anthropic con llave. Para las mediciones
//                             que van al informe y para el despliegue.
//   LLM_MODO=openai       ->  SDK de OpenAI con llave. Lo mismo que `api`, con
//                             otro proveedor detrás.
//
// La interfaz expone lo mínimo que el chatbot necesita: clasificar una intención
// y generar una respuesta con esquema. Nada más — cuanto más chica la superficie,
// menos puede cambiar de comportamiento entre los dos modos.
//
// Y una separación que importa decir: la suscripción personal sirve para
// desarrollar y probar en local. Una aplicación desplegada que atiende usuarios
// necesita crédito de API. No es un detalle técnico, es una condición de uso, y
// respetarla es parte del trabajo en un curso de IA responsable.
// ===========================================================================

import type {
  CostoDelTurno,
  NoticiaParaElModelo,
  RespuestaDelModelo,
  Sospecha,
  VeredictoCapa1,
  UbicacionDelUsuario,
} from "../tipos.ts";

export type TurnoDeHistorial = {
  rol: "usuario" | "asistente";
  contenido: string;
};

export type PeticionDeClasificacion = {
  mensaje: string;
  /**
   * Lo que vio la capa 0. Se le pasa como contexto, no como veredicto: el
   * clasificador decide, y estas señales solo le dicen dónde mirar.
   */
  sospechas: readonly Sospecha[];
};

export type PeticionDeRespuesta = {
  mensaje: string;
  noticias: readonly NoticiaParaElModelo[];
  historial: readonly TurnoDeHistorial[];
  /**
   * Cuando el clasificador detectó una tarea ajena, se le dice al modelo qué
   * negar. Va aparte del mensaje del usuario, nunca concatenado dentro de él.
   */
  tareaAjenaANegar: string | null;
  /** Para que «mi región» signifique algo. */
  ubicacion?: UbicacionDelUsuario | null;
};

export type Respondido<T> = {
  valor: T;
  costo: CostoDelTurno;
};

export type ProveedorLlm = {
  /** Para la bitácora y para saber en qué modo corrió una medición. */
  readonly nombre: string;
  /** Si este proveedor puede usarse en producción. */
  readonly aptoParaDespliegue: boolean;

  clasificar(peticion: PeticionDeClasificacion): Promise<Respondido<VeredictoCapa1>>;
  responder(peticion: PeticionDeRespuesta): Promise<Respondido<RespuestaDelModelo>>;
};

export type ModoLlm = "suscripcion" | "api" | "openai";

export class ConfiguracionInvalida extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "ConfiguracionInvalida";
  }
}

/**
 * Precios por millón de tokens, para calcular el costo de cada turno.
 *
 * Están aquí y no en el proveedor porque el informe necesita el costo real
 * medido, y medirlo requiere multiplicar los tokens que devuelve la API por un
 * precio que no cambia entre modos.
 *
 * Un modelo que no está acá cuesta CERO, y el tope de gasto suma estos costos:
 * usar un modelo nuevo sin agregarlo deja el tope sin efecto. Los de OpenAI son
 * los de su página de precios (nivel Standard) al 12 de octubre de 2026.
 */
export const PRECIOS_POR_MILLON: Readonly<
  Record<string, { entrada: number; salida: number; cache: number }>
> = {
  "claude-haiku-4-5": { entrada: 1.0, salida: 5.0, cache: 0.1 },
  "claude-sonnet-5": { entrada: 2.0, salida: 10.0, cache: 0.2 },
  "claude-opus-5": { entrada: 5.0, salida: 25.0, cache: 0.5 },
  "gpt-6-luna": { entrada: 0.1, salida: 0.5, cache: 0.01 },
  "gpt-6-sol": { entrada: 2.0, salida: 10.0, cache: 0.2 },
  "gpt-6.1-sol": { entrada: 2.0, salida: 10.0, cache: 0.1 },
  "gpt-5.6-luna": { entrada: 0.2, salida: 1.2, cache: 0.02 },
  "gpt-5.4-mini": { entrada: 0.75, salida: 4.5, cache: 0.075 },
  "gpt-5.4-nano": { entrada: 0.2, salida: 1.25, cache: 0.02 },
};

export function calcularCosto(
  modelo: string,
  tokensEntrada: number,
  tokensSalida: number,
  tokensCache: number,
): number {
  const precio = PRECIOS_POR_MILLON[modelo];
  if (precio === undefined) return 0;

  return (
    (tokensEntrada * precio.entrada +
      tokensSalida * precio.salida +
      tokensCache * precio.cache) /
    1_000_000
  );
}

export const COSTO_CERO: CostoDelTurno = {
  modelo: null,
  tokensEntrada: 0,
  tokensSalida: 0,
  tokensCache: 0,
  costoUsd: 0,
  latenciaMs: 0,
};

export function sumarCostos(...costos: readonly CostoDelTurno[]): CostoDelTurno {
  return costos.reduce<CostoDelTurno>(
    (total, c) => ({
      modelo: c.modelo ?? total.modelo,
      tokensEntrada: total.tokensEntrada + c.tokensEntrada,
      tokensSalida: total.tokensSalida + c.tokensSalida,
      tokensCache: total.tokensCache + c.tokensCache,
      costoUsd: total.costoUsd + c.costoUsd,
      latenciaMs: total.latenciaMs + c.latenciaMs,
    }),
    COSTO_CERO,
  );
}
