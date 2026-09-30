// ===========================================================================
// Fase 3 — Contratos del ranking de relevancia
//
// El feed se ordena con una fórmula, no con un modelo (ADR 0003). Cero tokens,
// y cada posición se puede justificar con números.
// ===========================================================================

export type EstadoNoticia =
  | "borrador"
  | "en_revision"
  | "verificada"
  | "no_verificable"
  | "desmentida"
  | "archivada";

export type TipoInteraccion = "lectura" | "reaccion" | "comentario";

export type ClavePeso =
  | "w_interaccion"
  | "w_verificadas"
  | "w_fuente"
  | "w_veracidad"
  | "gravedad";

export type Pesos = Readonly<Record<ClavePeso, number>>;

/**
 * Los pesos vigentes, que son los que siembra la migración. Los de verdad se
 * leen de `pesos_ranking`; estos son el respaldo y lo que usan las pruebas.
 *
 * `gravedad` bajó de 1.5 a 1.2 al calibrar contra los datos sembrados. Con 1.5,
 * tres horas de diferencia valían un factor de 2x, y como el término de
 * antigüedad se mueve en órdenes de magnitud mientras los de calidad están
 * acotados en 45 puntos, la frescura le ganaba siempre a estar bien sustentado.
 * El cambio está registrado en `pesos_ranking` con su motivo, como manda el
 * ADR 0003.
 */
export const PESOS_INICIALES: Pesos = {
  w_interaccion: 1.0,
  w_verificadas: 1.5,
  w_fuente: 20.0,
  w_veracidad: 25.0,
  gravedad: 1.2,
};

/**
 * Cuánto vale cada tipo de interacción antes de ponderar por la cuenta.
 *
 * No cuestan lo mismo: leer es gratis, reaccionar cuesta un clic, comentar
 * cuesta escribir. El orden importa más que los números exactos.
 */
export const VALOR_POR_TIPO: Readonly<Record<TipoInteraccion, number>> = {
  lectura: 1,
  reaccion: 3,
  comentario: 5,
};

/**
 * Días que tarda una cuenta en aportar peso completo al ranking.
 *
 * Es la defensa más barata contra una granja de cuentas: crear cincuenta
 * usuarios es cuestión de minutos, pero hacerlos viejos no se puede acelerar.
 */
export const DIAS_PARA_MADURAR = 14;

/**
 * Penalización por estado, en puntos del puntaje base.
 *
 * `null` significa que la noticia no entra al feed en absoluto.
 *
 * **Por qué `en_revision` es `null` y no una penalización fuerte.**
 * docs/ranking-relevancia.md dejaba la puerta abierta a las dos opciones, y al
 * implementar apareció la razón para cerrarla. El esquema de la Fase 1 tiene
 * una restricción —`noticias_publicada_tiene_fecha`— que solo permite
 * `publicada_en` a las noticias `verificada`. Sin fecha de publicación no hay
 * antigüedad que medir, y sin antigüedad no hay decaimiento: una noticia en
 * revisión se quedaría en el feed sin envejecer nunca.
 *
 * Se podría haber relajado la restricción o usar `creado_en` como sustituto,
 * pero la base tenía razón y el ranking no: mostrar en el feed público una
 * noticia que el canal de validación no dio por buena **es publicarla**,
 * penalizada o no. Y la regla que no se negocia del proyecto es que nada por
 * debajo del umbral se publica solo (docs/validacion-noticias.md).
 *
 * Las noticias en revisión aparecen en la cola de moderación, que es donde
 * tienen que estar.
 */
export const PENALIZACION_POR_ESTADO: Readonly<Record<EstadoNoticia, number | null>> = {
  verificada: 0,
  en_revision: null,
  borrador: null,
  no_verificable: null,
  desmentida: null,
  archivada: null,
};

/** Una interacción, con lo que hace falta para ponderarla. */
export type InteraccionDeRanking = {
  tipo: TipoInteraccion;
  /** Cuándo se registró. Alimenta la detección de ráfagas. */
  creadaEn: Date;
  /** Cuándo se creó la cuenta que interactuó. */
  cuentaCreadaEn: Date;
  /** Autoridad 0-100 si la cuenta está verificada; null si no lo está. */
  autoridad: number | null;
};

export type InsumosDeRanking = {
  idNoticia: string;
  estado: EstadoNoticia;
  publicadaEn: Date | null;
  /** 0-100. Null cuando la fuente no está en el registro. */
  credibilidadFuente: number | null;
  /** 0-100, de la Fase 2. */
  puntajeVeracidad: number | null;
  interacciones: readonly InteraccionDeRanking[];
};

/** Un renglón del «¿por qué está aquí?». */
export type RenglonDelDesglose = {
  concepto: string;
  /** Cómo entra en la fórmula: sumando, restando o multiplicando. */
  operacion: "suma" | "resta" | "multiplica";
  valor: number;
  /** En palabras, con los números que lo sustentan. */
  detalle: string;
};

export type DesgloseDeRelevancia = {
  idNoticia: string;
  /** False cuando el estado la deja fuera del feed. */
  visible: boolean;
  relevancia: number;
  puntajeBase: number;
  componenteInteracciones: number;
  componenteVerificadas: number;
  componenteFuente: number;
  componenteVeracidad: number;
  penalizacionEstado: number;
  /** El divisor por antigüedad que se aplicó. */
  factorAntiguedad: number;
  horasDesdePublicacion: number;
  renglones: readonly RenglonDelDesglose[];
  /** Si la noticia muestra señales de tracción coordinada. */
  rafaga: ResultadoDeRafaga;
};

export type ResultadoDeRafaga = {
  sospechosa: boolean;
  motivo: string;
  interaccionesEnLaVentana: number;
  cuentasNuevasImplicadas: number;
};

/** Carga los pesos vigentes. Una fila por clave, sin `vigente_hasta`. */
export type CargarPesos = () => Promise<Pesos>;
