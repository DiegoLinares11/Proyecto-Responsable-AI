// ===========================================================================
// Variables de entorno, leídas en un solo lugar
//
// Dos reglas:
//
//   1. **Nada de valores por omisión en lo que decide accesos o dinero.** Si
//      falta la llave de servicio o el modo del modelo, el arranque falla con un
//      mensaje que dice qué poner. Un valor por omisión convierte un error de
//      configuración en un comportamiento silencioso y distinto del que alguien
//      quiso.
//
//   2. **Lo del servidor no se exporta junto a lo del navegador.** Las lecturas
//      de secretos están en funciones que solo se llaman desde el servidor, y
//      cada una lo dice. En Next es fácil importar sin pensar un módulo del
//      servidor desde un componente de cliente y meter una llave de servicio en
//      el paquete que baja el navegador — con presupuesto de $20, eso se nota
//      el mismo día.
// ===========================================================================

export class FaltaConfiguracion extends Error {
  constructor(variable: string, para: string) {
    super(`Falta la variable de entorno ${variable}. Hace falta para ${para}. Ver .env.example.`);
    this.name = "FaltaConfiguracion";
  }
}

function exigir(variable: string, para: string): string {
  const valor = process.env[variable];
  if (valor === undefined || valor.trim() === "") {
    throw new FaltaConfiguracion(variable, para);
  }
  return valor.trim();
}

function opcional(variable: string): string | undefined {
  const valor = process.env[variable];
  return valor === undefined || valor.trim() === "" ? undefined : valor.trim();
}

function numero(variable: string, porOmision: number): number {
  const valor = opcional(variable);
  if (valor === undefined) return porOmision;
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    throw new FaltaConfiguracion(variable, `ser un número (está en «${valor}»)`);
  }
  return n;
}

/** Lo que el navegador puede ver. La llave publicable está hecha para eso. */
export function entornoPublico() {
  return {
    urlSupabase: exigir("NEXT_PUBLIC_SUPABASE_URL", "hablar con Supabase"),
    llavePublicable: exigir("NEXT_PUBLIC_SUPABASE_ANON_KEY", "hablar con Supabase desde el cliente"),
  };
}

/** SOLO SERVIDOR. Nunca llamar esto desde un componente de cliente. */
export function entornoServidor() {
  return {
    urlSupabase: exigir("NEXT_PUBLIC_SUPABASE_URL", "hablar con Supabase"),
    llaveDeServicio: exigir(
      "SUPABASE_SERVICE_ROLE_KEY",
      "que el servidor escriba la bitácora y mueva el estado de las noticias",
    ),
  };
}

/** SOLO SERVIDOR. Configuración del chatbot y de la validación. */
export function entornoDelModelo() {
  return {
    modo: opcional("LLM_MODO"),
    llaveAnthropic: opcional("ANTHROPIC_API_KEY"),
    llaveFactCheck: opcional("GOOGLE_FACT_CHECK_API_KEY"),
    topeMensajesPorUsuarioDia: numero("TOPE_MENSAJES_POR_USUARIO_DIA", 40),
    topeGastoUsd: numero("TOPE_GASTO_USD_ACUMULADO", 18),
  };
}
