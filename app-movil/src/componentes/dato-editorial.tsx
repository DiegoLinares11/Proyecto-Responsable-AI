import { StyleSheet, Text, View } from 'react-native';

import { Tipos, useColores } from '@/constants/tema';
import { Contexto, Diario, Pin, Reloj } from './iconos';

const ICONOS = { fuente: Diario, fecha: Reloj, zona: Pin, contexto: Contexto };

/** Icono y texto en una unidad que puede pasar completa al siguiente renglón. */
export function DatoEditorial({
  tipo,
  texto,
  destacado = false,
}: {
  tipo: keyof typeof ICONOS;
  texto: string;
  destacado?: boolean;
}) {
  const c = useColores();
  const Icono = ICONOS[tipo];
  const color = destacado ? c.acento : c.tintaSuave;
  return (
    <View style={estilos.fila} accessible accessibilityLabel={texto}>
      <View aria-hidden><Icono color={color} /></View>
      <Text style={[estilos.texto, { color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '100%' },
  texto: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 19, flexShrink: 1 },
});
