// ===========================================================================
// Agrupar las alertas de contenido para la pantalla de moderación
//
// Aparte de `consultas.ts` para poder probarla sin una sesión: la consulta la
// autoriza la política de fila, pero lo que el moderador termina viendo —qué se
// cuenta, qué se esconde— lo decide esta función.
// ===========================================================================

export type AlertaDeContenido = {
  idNoticia: string;
  titulo: string;
  /** Quién la publicó. Es lo que el moderador necesita para ver si es un patrón. */
  autor: string | null;
  fuente: string | null;
  veces: number;
  ultimaVez: string;
  evidencias: Array<{ comprobacion: string; evidencia: string; veces: number }>;
};

export type FilaDeAlerta = {
  id_noticia: string;
  comprobacion: string;
  evidencia: string;
  detectada_en: string;
  noticias: {
    titulo: string;
    estado: string;
    autor: { nombre: string } | null;
    fuentes: { nombre: string } | null;
  } | null;
};

/**
 * Una entrada por noticia, con cada evidencia distinta y cuántas veces apareció.
 *
 * Solo de noticias que siguen publicadas: si un moderador ya la sacó, la alerta
 * dejó de pedir una decisión. Las filas llegan de la más reciente a la más
 * vieja, así que la primera de cada noticia es la última vez que se detectó.
 */
export function agruparAlertas(filas: readonly FilaDeAlerta[]): AlertaDeContenido[] {
  const porNoticia = new Map<string, AlertaDeContenido>();

  for (const fila of filas) {
    if (fila.noticias?.estado !== "verificada") continue;

    let alerta = porNoticia.get(fila.id_noticia);
    if (alerta === undefined) {
      alerta = {
        idNoticia: fila.id_noticia,
        titulo: fila.noticias.titulo,
        autor: fila.noticias.autor?.nombre ?? null,
        fuente: fila.noticias.fuentes?.nombre ?? null,
        veces: 0,
        ultimaVez: fila.detectada_en,
        evidencias: [],
      };
      porNoticia.set(fila.id_noticia, alerta);
    }

    alerta.veces += 1;
    const misma = alerta.evidencias.find(
      (e) => e.comprobacion === fila.comprobacion && e.evidencia === fila.evidencia,
    );
    if (misma === undefined) {
      alerta.evidencias.push({ comprobacion: fila.comprobacion, evidencia: fila.evidencia, veces: 1 });
    } else {
      misma.veces += 1;
    }
  }

  return [...porNoticia.values()];
}
