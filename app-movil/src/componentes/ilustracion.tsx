// ===========================================================================
// La ilustración tipográfica de una noticia sin foto
//
// La sección y el titular compuestos con la letra del medio, sobre tinta. Sin
// IA y sin costo, y sin manera de confundirse con una fotografía del hecho: la
// grande lo dice además con una etiqueta. Es la segunda opción de R-10
// (docs/requisitos.md).
// ===========================================================================

import { StyleSheet, Text, View } from 'react-native';

import { SelloMarca } from '@/componentes/marca';
import { Radio, ROTULO, Tipos, useColores } from '@/constants/tema';

export function IlustracionTipografica({
  seccion,
  titulo,
  chica = false,
  media = false,
}: {
  seccion: string;
  titulo: string;
  /** La miniatura cuadrada de 92 px. */
  chica?: boolean;
  /** La de una tarjeta de la rejilla, en pantalla ancha. */
  media?: boolean;
}) {
  const c = useColores();

  if (media) {
    return (
      <View
        style={[estilos.media, { backgroundColor: c.ilustracion }]}
        accessible
        accessibilityLabel={`Ilustración de ${seccion}, no es una fotografía`}>
        <Text style={[estilos.rotuloMedio, { color: c.ilustracionAntetitulo }]} numberOfLines={1}>
          {seccion.toUpperCase()}
        </Text>
        <Text style={[estilos.tituloMedio, { color: c.ilustracionTexto }]} numberOfLines={3}>
          {titulo}
        </Text>
        <Text style={estilos.etiquetaChica}>ILUSTRACIÓN TIPOGRÁFICA</Text>
      </View>
    );
  }

  if (chica) {
    return (
      <View
        style={[estilos.chica, { backgroundColor: c.ilustracion }]}
        accessible
        accessibilityLabel={`Ilustración de ${seccion}, no es una fotografía`}>
        <Text style={[estilos.rotuloChico, { color: c.ilustracionAntetitulo }]} numberOfLines={1}>
          {seccion.toUpperCase()}
        </Text>
        <Text style={[estilos.tituloChico, { color: c.ilustracionTexto }]} numberOfLines={4}>
          {titulo}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[estilos.grande, { backgroundColor: c.ilustracion }]}
      accessible
      accessibilityLabel={`Ilustración de ${seccion}, no es una fotografía`}>
      <View style={estilos.cabecera}>
        <Text style={[ROTULO, { color: c.ilustracionAntetitulo }]}>{seccion.toUpperCase()}</Text>
        <SelloMarca tamano={28} tinta={c.ilustracionTexto} />
      </View>
      <Text style={[estilos.titulo, { color: c.ilustracionTexto }]} numberOfLines={3}>
        {titulo}
      </Text>
      <Text style={estilos.etiqueta}>ILUSTRACIÓN TIPOGRÁFICA</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  grande: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: Radio.chico,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontFamily: Tipos.lecturaCursiva, fontSize: 26, lineHeight: 30 },
  etiqueta: {
    alignSelf: 'flex-start',
    fontFamily: Tipos.textoMedio,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#C9D1DA',
    borderWidth: 1,
    borderColor: '#4A5260',
    borderRadius: Radio.chico,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: Radio.chico,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  rotuloMedio: { fontFamily: Tipos.textoFuerte, fontSize: 9, letterSpacing: 1.4 },
  tituloMedio: { fontFamily: Tipos.lecturaCursiva, fontSize: 17, lineHeight: 20 },
  etiquetaChica: {
    alignSelf: 'flex-start',
    fontFamily: Tipos.textoMedio,
    fontSize: 8,
    letterSpacing: 0.6,
    color: '#C9D1DA',
    borderWidth: 1,
    borderColor: '#4A5260',
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  chica: {
    width: 92,
    height: 92,
    borderRadius: Radio.chico,
    padding: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  rotuloChico: { fontFamily: Tipos.textoFuerte, fontSize: 7, letterSpacing: 1 },
  tituloChico: { fontFamily: Tipos.lecturaCursiva, fontSize: 12, lineHeight: 13 },
});
