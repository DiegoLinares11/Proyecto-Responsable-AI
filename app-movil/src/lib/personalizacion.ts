// ===========================================================================
// La personalización del feed
//
//   relevancia_personal = relevancia_global (Fase 3)
//                       × factor_geográfico (ubicación simulada del usuario)
//                       × factor_de_interés (lo que lee)
//
// y después, los CUPOS DE COBERTURA: entre las primeras posiciones hay siempre
// algo local de su zona, algo nacional de su país y algo internacional —si
// existen—, y lo más importante del día para todos aparece entre las tres
// primeras. Los cupos reacomodan, no filtran: ninguna preferencia saca una
// noticia del feed.
//
// Sin tokens, como el resto del ranking. Ordenar no necesita un modelo, y el
// enunciado pide evitar llamadas costosas cuando se puede resolver de otra
// forma.
//
// Este archivo no importa nada a propósito: lo usa la app y lo prueba la suite
// del repositorio (tests/unit/personalizacion/), que corre en Node sin Metro.
// ===========================================================================

export type Alcance = 'local' | 'nacional' | 'internacional';

export type NoticiaPersonalizable = {
  id: string;
  seccion: string;
  alcance: Alcance;
  pais: string | null;
  idUbicacion: string | null;
  /** La relevancia global de la Fase 3: la misma para todos. */
  relevancia: number;
};

export type Ubicacion = { id: string; nombre: string; pais: string };

/** Una lectura del propio usuario: alcanza con saber de qué sección era. */
export type Lectura = { seccion: string };

export type MotivoGeografico = 'tu_zona' | 'otra_zona' | 'tu_pais' | 'otro_pais' | 'internacional';

export type FactorGeografico = { valor: number; motivo: MotivoGeografico };

export type FactorDeInteres = {
  valor: number;
  seccion: string;
  /** Cuántas veces el usuario leyó esta sección, y cuántas leyó en total. */
  lecturas: number;
  total: number;
};

export type Garantia = 'lo_mas_importante' | 'local' | 'nacional' | 'internacional';

export type NoticiaPersonalizada<N extends NoticiaPersonalizable> = {
  noticia: N;
  geografico: FactorGeografico;
  interes: FactorDeInteres;
  relevanciaPersonal: number;
  /** Si está en su lugar por un cupo de cobertura y no por su puntaje. */
  garantizada: Garantia | null;
};

/**
 * Los factores, publicados. Son una decisión del equipo y se pueden discutir;
 * lo que no se puede es esconderlos.
 */
export const FACTORES_GEOGRAFICOS: Readonly<Record<MotivoGeografico, number>> = {
  tu_zona: 1.6,
  tu_pais: 1.2,
  internacional: 1.0,
  otro_pais: 1.0,
  // Empezó en 0.6 y los datos del 3 de octubre lo bajaron: a alguien en la
  // capital las cuatro primeras le salían locales de OTROS departamentos. Tenían
  // 3 a 6 horas contra 14 a 22 de lo internacional, y la frescura multiplica la
  // relevancia global casi ×4 en un mismo día. Con 0.6 eso ganaba igual; con
  // 0.2, lo de otra zona sigue en el feed pero no tapa lo nacional ni lo
  // internacional. (tests/unit/personalizacion, «calibración».)
  otra_zona: 0.2,
};

export const INTERES = {
  /** El interés reordena; nunca entierra. */
  minimo: 0.8,
  maximo: 1.4,
  /** Suaviza: leer el doble que el promedio no vale el doble de lugar. */
  exponente: 0.2,
  /** Cuántas secciones hay. Con cero lecturas, cada una pesa 1/8. */
  secciones: 8,
} as const;

export const CUPOS = {
  /** Dentro de cuántas posiciones tiene que haber local, nacional e internacional. */
  primeras: 6,
  /** Dentro de cuántas posiciones va lo más importante del día. */
  loMasImportante: 3,
} as const;

export function factorGeografico(noticia: NoticiaPersonalizable, ubicacion: Ubicacion): FactorGeografico {
  const motivo: MotivoGeografico =
    noticia.alcance === 'local'
      ? noticia.idUbicacion === ubicacion.id
        ? 'tu_zona'
        : 'otra_zona'
      : noticia.alcance === 'nacional'
        ? noticia.pais === ubicacion.pais
          ? 'tu_pais'
          : 'otro_pais'
        : 'internacional';

  return { valor: FACTORES_GEOGRAFICOS[motivo], motivo };
}

/**
 * El interés por sección.
 *
 * La proporción de lecturas de cada sección se suaviza —una lectura más por
 * sección— para que una sola nota no decida nada, se compara con la proporción
 * uniforme, y se eleva a 0.2 para que el efecto crezca despacio. El resultado
 * queda entre 0.8 y 1.4. Sin lecturas, todo vale 1: nadie es castigado por ser
 * nuevo.
 */
export function factorDeInteres(seccion: string, lecturas: readonly Lectura[]): FactorDeInteres {
  const total = lecturas.length;
  const deEsta = lecturas.filter((l) => l.seccion === seccion).length;
  const proporcion = (deEsta + 1) / (total + INTERES.secciones);
  const razon = proporcion * INTERES.secciones;
  const valor = Math.min(INTERES.maximo, Math.max(INTERES.minimo, razon ** INTERES.exponente));

  return { valor, seccion, lecturas: deEsta, total };
}

/** A qué cupo de cobertura cuenta una noticia para este usuario. */
function cupoDe(noticia: NoticiaPersonalizable, ubicacion: Ubicacion): Exclude<Garantia, 'lo_mas_importante'> | null {
  const { motivo } = factorGeografico(noticia, ubicacion);
  if (motivo === 'tu_zona') return 'local';
  if (motivo === 'tu_pais') return 'nacional';
  if (motivo === 'internacional' || motivo === 'otro_pais') return 'internacional';
  return null;
}

export function personalizar<N extends NoticiaPersonalizable>(
  noticias: readonly N[],
  ubicacion: Ubicacion,
  lecturas: readonly Lectura[],
): NoticiaPersonalizada<N>[] {
  const calculadas: NoticiaPersonalizada<N>[] = noticias.map((noticia) => {
    const geografico = factorGeografico(noticia, ubicacion);
    const interes = factorDeInteres(noticia.seccion, lecturas);
    return {
      noticia,
      geografico,
      interes,
      relevanciaPersonal: noticia.relevancia * geografico.valor * interes.valor,
      garantizada: null,
    };
  });

  // Orden estable y determinista: a igual puntaje personal manda el global, y
  // después el identificador. Dos teléfonos con la misma ubicación y el mismo
  // historial ven exactamente lo mismo.
  const orden = [...calculadas].sort(
    (a, b) =>
      b.relevanciaPersonal - a.relevanciaPersonal ||
      b.noticia.relevancia - a.noticia.relevancia ||
      a.noticia.id.localeCompare(b.noticia.id),
  );

  if (orden.length === 0) return orden;

  // 1. Lo más importante del día, para todos, entre las primeras tres. Se
  //    elige entre lo nacional e internacional: una noticia local es
  //    importante para su zona, no para todos. La primera versión elegía la de
  //    mayor relevancia global sin más, y con los datos reales esa era una
  //    nota de un centro de salud de Quetzaltenango, metida entre las tres
  //    primeras también para alguien en México.
  const generales = calculadas.filter((n) => n.noticia.alcance !== 'local');
  if (generales.length > 0) {
    const masImportante = generales.reduce((max, n) => (n.noticia.relevancia > max.noticia.relevancia ? n : max));
    const dondeEsta = orden.indexOf(masImportante);
    const tope = Math.min(CUPOS.loMasImportante, orden.length) - 1;
    if (dondeEsta > tope) {
      orden.splice(dondeEsta, 1);
      orden.splice(tope, 0, { ...masImportante, garantizada: 'lo_mas_importante' });
    }
  }

  // 2. Local, nacional e internacional entre las primeras seis. Los que faltan
  //    se juntan primero y se insertan al final de esa ventana, en orden, para
  //    que meter uno no empuje afuera al anterior.
  const ventana = Math.min(CUPOS.primeras, orden.length);
  const faltan: { item: NoticiaPersonalizada<N>; cupo: Exclude<Garantia, 'lo_mas_importante'> }[] = [];

  for (const cupo of ['local', 'nacional', 'internacional'] as const) {
    const yaEsta = orden.slice(0, ventana).some((n) => cupoDe(n.noticia, ubicacion) === cupo);
    if (yaEsta) continue;
    const candidata = orden.slice(ventana).find((n) => cupoDe(n.noticia, ubicacion) === cupo);
    if (candidata !== undefined) faltan.push({ item: candidata, cupo });
  }

  for (const { item } of faltan) orden.splice(orden.indexOf(item), 1);
  faltan.forEach(({ item, cupo }, i) => {
    orden.splice(ventana - faltan.length + i, 0, { ...item, garantizada: cupo });
  });

  return orden;
}
