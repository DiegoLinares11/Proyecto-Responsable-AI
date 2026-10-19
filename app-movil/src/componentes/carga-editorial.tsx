import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ANCHOS, Espacio, useColores } from '@/constants/tema';

/** Placeholder estático: conserva el indicador y no introduce esperas ni estados. */
export function CargaEditorial({ articulo = false }: { articulo?: boolean }) {
  const c = useColores();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={articulo ? 'Cargando noticia' : 'Cargando noticias'} style={estilos.contenedor}>
      <View aria-hidden style={[estilos.pieza, { backgroundColor: c.papelHundido }]}>
        <ActivityIndicator color={c.acento} style={{ alignSelf: 'flex-start' }} />
        <View style={[estilos.linea, { width: '30%', backgroundColor: c.borde }]} />
        <View style={[estilos.titular, { backgroundColor: c.borde }]} />
        <View style={[estilos.titular, { width: '80%', backgroundColor: c.borde }]} />
        <View style={[estilos.linea, { backgroundColor: c.borde }]} />
        <View style={[estilos.linea, { width: '65%', backgroundColor: c.borde }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%', maxWidth: ANCHOS.lectura, alignSelf: 'center', padding: Espacio.pagina, marginTop: Espacio.xl },
  pieza: { borderRadius: 16, padding: Espacio.xl, gap: Espacio.l },
  titular: { height: 28, width: '100%', borderRadius: 6 },
  linea: { height: 14, width: '95%', borderRadius: 4 },
});
