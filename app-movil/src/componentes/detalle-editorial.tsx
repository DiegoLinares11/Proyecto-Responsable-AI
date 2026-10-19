import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Espacio, Tipos, useColores } from '@/constants/tema';
import { Abajo } from './iconos';
import { MOVIMIENTO } from '@/constants/movimiento';

const ENTRADA = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
const SALIDA = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

/** Primero la explicación breve; los datos técnicos quedan a un toque. */
export function DetalleEditorial({ titulo, children, abierto: controlado, alCambiar }: {
  titulo: string; children: ReactNode; abierto?: boolean; alCambiar?: (valor: boolean) => void;
}) {
  const [interno, setInterno] = useState(false);
  const abierto = controlado ?? interno;
  const c = useColores();
  const giro = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(abierto ? '180deg' : '0deg', MOVIMIENTO.breve) }] }));
  return (
    <View>
      <Pressable
        onPress={() => { setInterno(!abierto); alCambiar?.(!abierto); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        aria-expanded={abierto}
        style={({ pressed }) => [estilos.control, { borderColor: c.bordeFuerte, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[estilos.titulo, { color: c.tinta }]}>{titulo}</Text>
        <Animated.View aria-hidden style={giro}>
          <Abajo color={c.tinta} tamano={16} />
        </Animated.View>
      </Pressable>
      {abierto ? <Animated.View entering={ENTRADA} exiting={SALIDA} style={estilos.detalle}>{children}</Animated.View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  control: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Espacio.l, borderTopWidth: 1, paddingVertical: Espacio.l },
  titulo: { flex: 1, fontFamily: Tipos.textoMedio, fontSize: 14, lineHeight: 23 },
  detalle: { paddingTop: Espacio.s, paddingBottom: Espacio.s, gap: Espacio.l },
});
