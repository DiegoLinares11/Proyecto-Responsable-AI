// «¿Por qué está aquí?», en una línea. El enunciado pide que el sistema pueda
// explicar qué muestra, en qué orden y con qué prominencia a cada usuario; la
// forma de no esconderlo es decirlo al lado de cada noticia.

import type { NoticiaDelFeed } from './noticias';
import type { NoticiaPersonalizada } from './personalizacion';
import { nombreDeSeccion } from './secciones';

export type Razon = { texto: string; tono: 'zona' | 'cobertura' | 'neutro' };

export function porQue(item: NoticiaPersonalizada<NoticiaDelFeed>): Razon {
  const { noticia, geografico, interes, garantizada } = item;
  const zona = noticia.zona ?? 'otra zona';

  if (garantizada === 'lo_mas_importante') {
    return { texto: 'Lo más importante del día, para todos', tono: 'cobertura' };
  }
  if (garantizada !== null) {
    const que = garantizada === 'local' ? `lo de ${zona}` : `lo ${garantizada}`;
    return { texto: `Para que no te pierdas ${que}`, tono: 'cobertura' };
  }

  const donde = {
    tu_zona: `De tu zona · ${zona}`,
    otra_zona: `Local de ${zona}`,
    tu_pais: 'Nacional',
    otro_pais: 'De otro país',
    internacional: 'Internacional',
  }[geografico.motivo];

  const seccion = nombreDeSeccion(interes.seccion);
  const gusto =
    interes.valor >= 1.05 ? ` · leés ${seccion}` : interes.valor <= 0.95 ? ` · leés poco ${seccion}` : '';

  return { texto: donde + gusto, tono: geografico.motivo === 'tu_zona' ? 'zona' : 'neutro' };
}
