import { StyleSheet, Text, View } from 'react-native';

import { ROTULO, Tipos, useColores } from '@/constants/tema';
import type { NoticiaDelFeed } from '@/lib/noticias';
import { nombreDeSeccion } from '@/lib/secciones';
import { DatoEditorial } from './dato-editorial';

/** Una sola composición: la noticia es la pieza gráfica, no su duplicado. */
export function AperturaTipografica({ noticia, ancha = false }: { noticia: NoticiaDelFeed; ancha?: boolean }) {
  const c = useColores();
  return (
    <View style={estilos.pieza}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.rotulo, { color: c.acento }]}>{nombreDeSeccion(noticia.seccion).toUpperCase()}</Text>
        {noticia.zona ? <DatoEditorial tipo="zona" texto={noticia.zona} /> : null}
      </View>
      <Text style={[estilos.titulo, { color: c.tinta, fontSize: ancha ? 36 : 26, lineHeight: ancha ? 44 : 33 }]}>{noticia.titulo}</Text>
      <Text style={[estilos.resumen, { color: c.tintaSuave, fontSize: ancha ? 17 : 15, lineHeight: ancha ? 27 : 23 }]}>{noticia.resumen}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pieza: { gap: 10 },
  cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  rotulo: { ...ROTULO, fontSize: 11, lineHeight: 17, letterSpacing: 0.5 },
  titulo: { fontFamily: Tipos.titular, letterSpacing: -0.7 },
  resumen: { fontFamily: Tipos.lectura },
});
