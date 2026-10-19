import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Tipos, useColores } from '@/constants/tema';
import { MarcaNexo } from './marca';

/** Ocupa el mismo espacio que la foto sin atribuir una imagen a la noticia. */
export function ReservaDeImagen({ estilo, miniatura = false }: {
  estilo: StyleProp<ViewStyle>;
  miniatura?: boolean;
}) {
  const c = useColores();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Noticia sin imagen"
      style={[estilo, estilos.reserva, { backgroundColor: c.papelHundido, borderColor: c.borde }]}>
      <MarcaNexo variante="simbolo" tamano={miniatura ? 28 : 44} />
      {!miniatura ? <Text style={[estilos.etiqueta, { color: c.tintaTenue }]}>Sin imagen</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  reserva: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, overflow: 'hidden' },
  etiqueta: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 18 },
});
