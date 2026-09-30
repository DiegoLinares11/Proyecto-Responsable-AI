// ===========================================================================
// Dobles de los puertos externos
//
// Ninguna prueba toca la red. Una suite que depende de que GDELT esté de buenas
// no es una suite, es una apuesta: falla cuando no debe y, peor, pasa por
// razones que no son la que se quería comprobar.
// ===========================================================================

import type {
  ArticuloExterno,
  BuscarCobertura,
  BuscarDesmentidos,
  BuscarFuente,
  Dependencias,
  Desmentido,
  FuenteRegistrada,
  RespuestaHttp,
  TraerUrl,
} from "../../../src/modules/validacion/index.ts";

/** Las mismas fuentes que siembra la migración, en versión mínima. */
export const FUENTES: readonly FuenteRegistrada[] = [
  { dominio: "reuters.com", nombre: "Reuters", nivel: "agencia_internacional", puntajeCredibilidad: 90 },
  { dominio: "apnews.com", nombre: "Associated Press", nivel: "agencia_internacional", puntajeCredibilidad: 90 },
  { dominio: "bbc.com", nombre: "BBC", nivel: "agencia_internacional", puntajeCredibilidad: 85 },
  { dominio: "prensalibre.com", nombre: "Prensa Libre", nivel: "medio_nacional", puntajeCredibilidad: 75 },
  { dominio: "lahora.gt", nombre: "La Hora", nivel: "medio_nacional", puntajeCredibilidad: 70 },
  { dominio: "soy502.com", nombre: "Soy502", nivel: "medio_digital", puntajeCredibilidad: 55 },
];

export function buscarFuenteFalso(fuentes: readonly FuenteRegistrada[] = FUENTES): BuscarFuente {
  return async (candidatos) => {
    for (const candidato of candidatos) {
      const hallada = fuentes.find((f) => f.dominio === candidato);
      if (hallada !== undefined) return hallada;
    }
    return null;
  };
}

/** Páginas por URL. Lo que no esté en el mapa responde 404. */
export function traerUrlFalso(paginas: Record<string, RespuestaHttp | Error>): TraerUrl {
  return async (url) => {
    const respuesta = paginas[url];
    if (respuesta === undefined) return { estado: 404, html: "" };
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  };
}

export function coberturaFalsa(articulos: ArticuloExterno[] | Error): BuscarCobertura {
  return async () => {
    if (articulos instanceof Error) throw articulos;
    return articulos;
  };
}

export function desmentidosFalsos(hallazgos: Desmentido[] | Error): BuscarDesmentidos {
  return async () => {
    if (hallazgos instanceof Error) throw hallazgos;
    return hallazgos;
  };
}

/** Una página HTML con los metadatos que se le pidan. */
export function paginaCon(titulo: string, publicadoEn?: string): RespuestaHttp {
  const fecha =
    publicadoEn === undefined
      ? ""
      : `<meta property="article:published_time" content="${publicadoEn}">`;
  return {
    estado: 200,
    html: `<!doctype html><html><head>
      <meta charset="utf-8">
      <meta property="og:title" content="${titulo}">
      <meta property="og:description" content="Descripcion de prueba.">
      ${fecha}
      <title>${titulo} | Medio de prueba</title>
    </head><body><p>Cuerpo.</p></body></html>`,
  };
}

/** Fecha fija, para que las pruebas de antigüedad no dependan del día. */
export const AHORA = new Date("2026-09-30T12:00:00.000Z");

export type SobreescribirDeps = Partial<Dependencias>;

/**
 * Dependencias por omisión: fuentes sembradas, ninguna página, sin cobertura,
 * sin desmentidos y con verificador configurado. Cada prueba cambia solo lo
 * que le interesa.
 */
export function deps(cambios: SobreescribirDeps = {}): Dependencias {
  return {
    buscarFuente: buscarFuenteFalso(),
    traerUrl: traerUrlFalso({}),
    buscarCobertura: coberturaFalsa([]),
    buscarDesmentidos: desmentidosFalsos([]),
    ahora: () => AHORA,
    exigirVerificadorDeHechos: true,
    ...cambios,
  };
}

/** Un cuerpo largo que repite las palabras del titular, para pasar coherencia. */
export function cuerpoQueRespalda(titulo: string): string {
  return (
    `${titulo}. ` +
    `El hecho ocurrio segun la informacion disponible. ${titulo}, ` +
    "confirmaron las autoridades en una conferencia de prensa realizada esta manana. " +
    `Los detalles del caso siguen bajo revision. ${titulo}.`
  );
}
