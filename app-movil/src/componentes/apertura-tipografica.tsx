import { StyleSheet, Text, View } from 'react-native';

import { Espacio, ROTULO, Tipos, useColores } from '@/constants/tema';
import type { NoticiaDelFeed } from '@/lib/noticias';
import { nombreDeSeccion } from '@/lib/secciones';
import { DatoEditorial } from './dato-editorial';
import { GestoDeSeccion } from './gesto-de-seccion';

/** Una sola composición: la noticia es la pieza gráfica, no su duplicado. */
export function AperturaTipografica({ noticia, ancha = false }: { noticia: NoticiaDelFeed; ancha?: boolean }) {
  const c = useColores();
  return (
    <View style={[estilos.pieza, { backgroundColor: c.papelHundido, borderColor: c.borde, padding: ancha ? 32 : 20 }]}>
      <View style={estilos.cabecera}>
        <View style={[estilos.rotulo, { borderColor: c.acento }]}>
          <Text style={[ROTULO, { color: c.acento }]}>{nombreDeSeccion(noticia.seccion).toUpperCase()}</Text>
        </View>
        <View aria-hidden>
          <GestoDeSeccion seccion={noticia.seccion} />
        </View>
      </View>
      {noticia.zona ? <DatoEditorial tipo="zona" texto={noticia.zona} /> : null}
      <Text style={[estilos.titulo, { color: c.tinta, fontSize: ancha ? 48 : 33, lineHeight: ancha ? 53 : 38 }]}>{noticia.titulo}</Text>
      <View style={[estilos.linea, { backgroundColor: c.marca }]} />
      <Text style={[estilos.resumen, { color: c.tintaSuave, fontSize: ancha ? 21 : 18, lineHeight: ancha ? 30 : 27 }]}>{noticia.resumen}</Text>
      <View style={[estilos.pie, { borderColor: c.bordeFuerte }]}>
        <DatoEditorial tipo="fuente" texto="Edición tipográfica" />
        <Text style={[estilos.folio, { color: c.tintaTenue }]} aria-hidden>01</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pieza: { borderWidth: 1, gap: Espacio.l },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espacio.l },
  rotulo: { flexShrink: 1, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 24 },
  titulo: { fontFamily: Tipos.titular, letterSpacing: -0.6 },
  linea: { width: 48, height: 3, marginVertical: Espacio.s },
  resumen: { fontFamily: Tipos.lectura },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Espacio.l, borderTopWidth: 1, marginTop: Espacio.s },
  folio: { fontFamily: Tipos.numeros, fontSize: 26, lineHeight: 32 },
});
