// ===========================================================================
// Fase 3 — La fórmula
//
//   puntaje_base = w_interaccion · ln(1 + interacciones_ponderadas)
//                + w_verificadas · ln(1 + verificadas_ponderadas)
//                + w_fuente      · (credibilidad / 100)
//                + w_veracidad   · (veracidad / 100)
//                - penalizacion_estado
//
//   relevancia = puntaje_base / (horas_desde_publicacion + 2) ^ gravedad
//
// El divisor es el del ranking de Hacker News. Sin él, la noticia más vieja con
// más acumulado se queda arriba para siempre y el feed deja de ser un feed.
//
// El logaritmo es deliberado: sin él, una noticia con 1,000 reacciones aplasta a
// una con 100 aunque no sea diez veces más relevante. Con él, cada interacción
// adicional aporta menos que la anterior, que es como funciona la atención.
//
// Cada componente se devuelve por separado, y de ahí sale el «¿por qué está
// aquí?» de la interfaz. Un ordenamiento que no se puede explicar es lo que este
// curso enseña a no construir (ADR 0003).
// ===========================================================================

import {
  DIAS_PARA_MADURAR,
  PENALIZACION_POR_ESTADO,
  VALOR_POR_TIPO,
  type DesgloseDeRelevancia,
  type InsumosDeRanking,
  type InteraccionDeRanking,
  type Pesos,
  type RenglonDelDesglose,
} from "./tipos.ts";
import { detectarRafaga, type OpcionesDeRafaga } from "./rafagas.ts";

function redondear(valor: number, decimales = 4): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/**
 * Cuánto pesa una cuenta según su antigüedad, de 0 a 1.
 *
 * Crecimiento lineal hasta los `DIAS_PARA_MADURAR` días. Una cuenta creada hoy
 * aporta casi nada; una de dos semanas aporta todo. Sube el costo de armar una
 * granja de cuentas de una forma que el atacante no puede acelerar: el tiempo no
 * se compra.
 */
export function factorPorAntiguedadDeCuenta(cuentaCreadaEn: Date, ahora: Date): number {
  const dias = (ahora.getTime() - cuentaCreadaEn.getTime()) / 86_400_000;
  if (dias <= 0) return 0;
  if (dias >= DIAS_PARA_MADURAR) return 1;
  return dias / DIAS_PARA_MADURAR;
}

function ponderarInteracciones(
  interacciones: readonly InteraccionDeRanking[],
  ahora: Date,
): { total: number; porTipo: Record<string, number> } {
  let total = 0;
  const porTipo: Record<string, number> = { lectura: 0, reaccion: 0, comentario: 0 };

  for (const interaccion of interacciones) {
    const factor = factorPorAntiguedadDeCuenta(interaccion.cuentaCreadaEn, ahora);
    total += VALOR_POR_TIPO[interaccion.tipo] * factor;
    porTipo[interaccion.tipo] = (porTipo[interaccion.tipo] ?? 0) + 1;
  }

  return { total, porTipo };
}

/**
 * Las reacciones de cuentas verificadas, ponderadas por su autoridad.
 *
 * Requisito explícito del proyecto: que una fuente pese más que otra. La
 * reacción de un medio acreditado mueve la aguja más que la de una cuenta
 * recién creada, y eso está guardado como número y no como intuición.
 *
 * Estas interacciones también cuentan en el término general: su autoridad es un
 * bono encima, no un reemplazo.
 */
function ponderarVerificadas(
  interacciones: readonly InteraccionDeRanking[],
  ahora: Date,
): { total: number; cuentas: number; autoridadPromedio: number } {
  let total = 0;
  let cuentas = 0;
  let sumaDeAutoridad = 0;

  for (const interaccion of interacciones) {
    if (interaccion.autoridad === null) continue;
    if (interaccion.tipo === "lectura") continue; // que lo lean no es respaldo

    const factor = factorPorAntiguedadDeCuenta(interaccion.cuentaCreadaEn, ahora);
    total += (interaccion.autoridad / 100) * factor;
    cuentas++;
    sumaDeAutoridad += interaccion.autoridad;
  }

  return {
    total,
    cuentas,
    autoridadPromedio: cuentas === 0 ? 0 : Math.round(sumaDeAutoridad / cuentas),
  };
}

export type OpcionesDeCalculo = {
  ahora?: Date;
  rafaga?: OpcionesDeRafaga;
};

export function calcularRelevancia(
  insumos: InsumosDeRanking,
  pesos: Pesos,
  opciones: OpcionesDeCalculo = {},
): DesgloseDeRelevancia {
  const ahora = opciones.ahora ?? new Date();
  const rafaga = detectarRafaga(insumos.interacciones, ahora, opciones.rafaga);

  const penalizacion = PENALIZACION_POR_ESTADO[insumos.estado];

  // Estados que no entran al feed. Se devuelve el desglose igual, porque el
  // autor tiene derecho a ver por qué su noticia no aparece.
  if (penalizacion === null) {
    return {
      idNoticia: insumos.idNoticia,
      visible: false,
      relevancia: 0,
      puntajeBase: 0,
      componenteInteracciones: 0,
      componenteVerificadas: 0,
      componenteFuente: 0,
      componenteVeracidad: 0,
      penalizacionEstado: 0,
      factorAntiguedad: 0,
      horasDesdePublicacion: 0,
      renglones: [
        {
          concepto: "Estado",
          operacion: "resta",
          valor: 0,
          detalle: `Una noticia en estado «${insumos.estado}» no entra al feed.`,
        },
      ],
      rafaga,
    };
  }

  const { total: interaccionesPonderadas, porTipo } = ponderarInteracciones(
    insumos.interacciones,
    ahora,
  );
  const verificadas = ponderarVerificadas(insumos.interacciones, ahora);

  const credibilidad = insumos.credibilidadFuente ?? 0;
  const veracidad = insumos.puntajeVeracidad ?? 0;

  const componenteInteracciones = pesos.w_interaccion * Math.log1p(interaccionesPonderadas);
  const componenteVerificadas = pesos.w_verificadas * Math.log1p(verificadas.total);
  const componenteFuente = pesos.w_fuente * (credibilidad / 100);

  // La veracidad entra AL CUADRADO. Medido contra los datos sembrados: en lineal,
  // una noticia que raspó el umbral con 76 se llevaba 19 de los 25 puntos —el
  // 76% de lo que vale estar sólidamente corroborado con 92, que se llevaba 23—
  // y con cuatro puntos de diferencia el término dejaba de distinguir «apenas
  // aceptable» de «bien sustentado». Al cuadrado, 76 vale 14.4 y 92 vale 21.2.
  //
  // La credibilidad de la fuente se deja lineal a propósito: es un juicio curado
  // en escalas gruesas (agencia, medio nacional, medio digital), no una medición
  // sobre un umbral, y elevarla al cuadrado castigaría de más a los medios
  // intermedios legítimos — que es justo el punto ciego que el registro ya tiene.
  const componenteVeracidad = pesos.w_veracidad * (veracidad / 100) ** 2;

  const puntajeBase =
    componenteInteracciones +
    componenteVerificadas +
    componenteFuente +
    componenteVeracidad -
    penalizacion;

  // Sin fecha de publicación no hay antigüedad que medir. Ocurre solo en
  // estados que no entran al feed, pero la fórmula no debe depender de eso.
  const horas =
    insumos.publicadaEn === null
      ? 0
      : Math.max(0, (ahora.getTime() - insumos.publicadaEn.getTime()) / 3_600_000);

  const divisor = (horas + 2) ** pesos.gravedad;
  const factorAntiguedad = 1 / divisor;

  // El puntaje base puede quedar negativo si la penalización supera lo
  // acumulado. Dividirlo por el decaimiento lo acercaría a cero desde abajo, y
  // una noticia penalizada se vería mejor con el paso de las horas.
  const relevancia = puntajeBase <= 0 ? 0 : puntajeBase / divisor;

  const renglones: RenglonDelDesglose[] = [
    {
      concepto: "Interacciones en la plataforma",
      operacion: "suma",
      valor: redondear(componenteInteracciones, 2),
      detalle:
        `${porTipo["reaccion"] ?? 0} reacciones, ${porTipo["comentario"] ?? 0} comentarios, ` +
        `${porTipo["lectura"] ?? 0} lecturas. Ponderadas por antigüedad de cuenta dan ` +
        `${redondear(interaccionesPonderadas, 1)} puntos de tracción.`,
    },
    {
      concepto: "Reacciones de cuentas verificadas",
      operacion: "suma",
      valor: redondear(componenteVerificadas, 2),
      detalle:
        verificadas.cuentas === 0
          ? "Ninguna cuenta verificada ha respaldado esta noticia."
          : `${verificadas.cuentas} ${verificadas.cuentas === 1 ? "cuenta verificada" : "cuentas verificadas"}, ` +
            `autoridad promedio ${verificadas.autoridadPromedio} de 100.`,
    },
    {
      concepto: "Credibilidad de la fuente",
      operacion: "suma",
      valor: redondear(componenteFuente, 2),
      detalle:
        insumos.credibilidadFuente === null
          ? "La fuente no está en el registro, así que no aporta credibilidad."
          : `${insumos.credibilidadFuente} de 100 en el registro de fuentes.`,
    },
    {
      concepto: "Veracidad",
      operacion: "suma",
      valor: redondear(componenteVeracidad, 2),
      detalle:
        insumos.puntajeVeracidad === null
          ? "Todavía no se ha evaluado la veracidad."
          : `${insumos.puntajeVeracidad} de 100 en el canal de validación. Entra al cuadrado, ` +
            "para que raspar el umbral no valga casi lo mismo que estar sólidamente corroborado.",
    },
  ];

  if (penalizacion > 0) {
    renglones.push({
      concepto: "Estado",
      operacion: "resta",
      valor: redondear(penalizacion, 2),
      detalle: `La noticia está «${insumos.estado}» y todavía no la ha aprobado una persona.`,
    });
  }

  renglones.push({
    concepto: "Antigüedad",
    operacion: "multiplica",
    valor: redondear(factorAntiguedad, 4),
    detalle:
      `${redondear(horas, 1)} horas desde la publicación. El decaimiento evita que lo viejo con ` +
      "mucho acumulado se quede arriba para siempre.",
  });

  return {
    idNoticia: insumos.idNoticia,
    visible: true,
    relevancia: redondear(relevancia),
    puntajeBase: redondear(puntajeBase),
    componenteInteracciones: redondear(componenteInteracciones),
    componenteVerificadas: redondear(componenteVerificadas),
    componenteFuente: redondear(componenteFuente),
    componenteVeracidad: redondear(componenteVeracidad),
    penalizacionEstado: redondear(penalizacion),
    // Seis decimales y no cuatro: es un multiplicador, y con valores del orden
    // de 0.08 cuatro decimales pierden bastante. La interfaz lo muestra
    // redondeado; lo que se guarda tiene que permitir reproducir el numero.
    factorAntiguedad: redondear(factorAntiguedad, 6),
    horasDesdePublicacion: redondear(horas, 2),
    renglones,
    rafaga,
  };
}

/** El «¿por qué está aquí?» en texto, para la interfaz y para el informe. */
export function explicarRelevancia(desglose: DesgloseDeRelevancia): string {
  if (!desglose.visible) {
    return desglose.renglones[0]?.detalle ?? "Esta noticia no entra al feed.";
  }

  const lineas = [`Relevancia ${desglose.relevancia}`];

  for (const renglon of desglose.renglones) {
    const signo =
      renglon.operacion === "suma" ? "+" : renglon.operacion === "resta" ? "−" : "×";
    lineas.push(
      `  ${renglon.concepto.padEnd(34)} ${signo}${String(renglon.valor).padStart(8)}   (${renglon.detalle})`,
    );
  }

  if (desglose.rafaga.sospechosa) {
    lineas.push(`  ⚠ ${desglose.rafaga.motivo}`);
  }

  return lineas.join("\n");
}

/** Ordena de mayor a menor relevancia, dejando fuera lo que no es visible. */
export function ordenarPorRelevancia(
  desgloses: readonly DesgloseDeRelevancia[],
): DesgloseDeRelevancia[] {
  return desgloses
    .filter((d) => d.visible)
    .sort((a, b) => b.relevancia - a.relevancia || a.idNoticia.localeCompare(b.idNoticia));
}
