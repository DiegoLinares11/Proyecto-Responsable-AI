// ===========================================================================
// Fase 2 — Contratos del canal de validación
//
// Ninguna de estas piezas llama a un modelo de lenguaje. Ver
// docs/adr/0002-validacion-determinista.md para el por qué: el modelo no sabe
// si una noticia de esta mañana es cierta, y "el modelo dijo que sí" no es una
// justificación que se le pueda dar a un publicador cuya nota fue rechazada.
// ===========================================================================

export type ClaveSenal =
  | "credibilidad_fuente"
  | "url_verificable"
  | "corroboracion"
  | "desmentido"
  | "coherencia";

export type EstadoVeredicto =
  | "verificada"
  | "en_revision"
  | "no_verificable"
  | "desmentida";

/**
 * Lo máximo que puede aportar cada señal. Suman 100.
 *
 * `desmentido` no aporta puntos: es un veto. Una afirmación ya verificada como
 * falsa por una organización de fact-checking no se compensa teniendo buena
 * fuente y buena redacción.
 */
export const MAXIMOS: Readonly<Record<ClaveSenal, number>> = {
  credibilidad_fuente: 30,
  url_verificable: 20,
  corroboracion: 30,
  coherencia: 20,
  desmentido: 0,
};

export const UMBRAL_VERIFICADA = 75;
export const UMBRAL_REVISION = 45;

/** El puntaje con el que entra un dominio que no está en el registro. */
export const CREDIBILIDAD_DESCONOCIDA = 20;

/** Desde cuánto se considera que un medio corrobora "de buen nivel". */
export const CREDIBILIDAD_BUEN_NIVEL = 60;

/** Lo que aporta una señal, con su evidencia. */
export type ResultadoSenal = {
  senal: ClaveSenal;
  /** Puntos obtenidos, entre 0 y `maximo`. */
  aporte: number;
  /** Tope de la señal, para poder mostrar «18 de 30» en la interfaz. */
  maximo: number;
  /**
   * False cuando NO SE PUDO AVERIGUAR: la fuente externa no respondió, o no
   * está configurada. Es distinto de averiguar que la respuesta es mala.
   *
   * Una señal indisponible impide que la noticia llegue a `verificada` sola,
   * por muy alto que sea el puntaje. Nunca se da por corroborada una noticia
   * por falta de datos (ADR 0002).
   */
  disponible: boolean;
  /** True solo en `desmentido`: corta el proceso sin importar el resto. */
  veto: boolean;
  /**
   * La evidencia. Va tal cual a la columna `detalle` de `validaciones`, y es
   * lo que se le muestra al usuario cuando pregunta por qué.
   */
  detalle: Record<string, unknown>;
};

export type NoticiaAValidar = {
  titulo: string;
  resumen: string;
  cuerpo: string;
  urlOriginal: string | null;
  /** Fecha que declara el publicador. Puede no coincidir con la real. */
  publicadaEn: Date | null;
};

export type Veredicto = {
  /** 0 a 100. La suma de los aportes, recortada. */
  puntaje: number;
  estado: EstadoVeredicto;
  /** Una línea que explica por qué quedó en ese estado. */
  motivo: string;
  /** Siempre las cinco, en orden fijo, disponibles o no. */
  senales: ResultadoSenal[];
};

/** Un medio en el registro `fuentes`. */
export type FuenteRegistrada = {
  dominio: string;
  nombre: string;
  nivel: string;
  puntajeCredibilidad: number;
};

/** Un artículo encontrado en una fuente externa de corroboración. */
export type ArticuloExterno = {
  url: string;
  dominio: string;
  titulo: string;
};

/** Un desmentido publicado por una organización de fact-checking. */
export type Desmentido = {
  afirmacion: string;
  editor: string;
  calificacion: string;
  url: string;
};

export type RespuestaHttp = {
  estado: number;
  html: string;
};

// ---------------------------------------------------------------------------
// Puertos
//
// Todo el acceso al exterior entra por aquí. Las pruebas pasan dobles y nunca
// tocan la red: una suite que depende de que GDELT esté de buenas no es una
// suite, es una apuesta.
// ---------------------------------------------------------------------------

/** Busca el primer candidato de dominio que esté en el registro. */
export type BuscarFuente = (candidatos: string[]) => Promise<FuenteRegistrada | null>;

/** Descarga una URL. Debe lanzar si la red falla; devolver si el servidor responde. */
export type TraerUrl = (url: string) => Promise<RespuestaHttp>;

/** Busca cobertura del mismo hecho en medios externos. */
export type BuscarCobertura = (consulta: string) => Promise<ArticuloExterno[]>;

/** Busca desmentidos. `null` cuando el verificador no está configurado. */
export type BuscarDesmentidos = ((consulta: string) => Promise<Desmentido[]>) | null;

export type Dependencias = {
  buscarFuente: BuscarFuente;
  traerUrl: TraerUrl;
  buscarCobertura: BuscarCobertura;
  buscarDesmentidos: BuscarDesmentidos;
  /** Inyectable para que las pruebas de fecha no dependan del día que corren. */
  ahora?: () => Date;
  /**
   * Si es true (por omisión) y no hay verificador de desmentidos configurado,
   * ninguna noticia puede llegar a `verificada` automáticamente.
   *
   * Ponerlo en false es una decisión editorial: se está aceptando publicar sin
   * haber comprobado si la afirmación ya fue desmentida. Queda registrada en
   * el detalle de la señal y de ahí pasa a la auditoría.
   */
  exigirVerificadorDeHechos?: boolean;
};
