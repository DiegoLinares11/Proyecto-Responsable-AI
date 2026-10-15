import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useColores } from '@/constants/tema';
import { MOVIMIENTO } from '@/constants/movimiento';

const Pulsable = Animated.createAnimatedComponent(Pressable);

/** La línea expresa interacción; las dimensiones del artículo no cambian. */
export function EnlaceDeNoticia({ children, onPress, style }: { children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useColores();
  const destacado = useSharedValue(0);
  const presionado = useSharedValue(0);
  const enfocado = useSharedValue(false);
  const encima = useSharedValue(false);
  const animacion = useAnimatedStyle(() => ({
    opacity: 1 - presionado.value * 0.18,
  }));
  const linea = useAnimatedStyle(() => ({
    opacity: destacado.value,
    transform: [{ scaleX: destacado.value }],
  }));
  function resaltar() { destacado.set(withTiming(enfocado.get() || encima.get() ? 1 : 0, MOVIMIENTO.breve)); }
  return (
    <Pulsable
      onPress={onPress} accessibilityRole="link"
      onHoverIn={() => { encima.set(true); resaltar(); }} onHoverOut={() => { encima.set(false); resaltar(); }}
      onFocus={() => { enfocado.set(true); resaltar(); }} onBlur={() => { enfocado.set(false); resaltar(); }}
      onPressIn={() => { presionado.set(withTiming(1, MOVIMIENTO.breve)); }} onPressOut={() => { presionado.set(withTiming(0, MOVIMIENTO.breve)); }}
      style={[style, animacion]}>
      {children}
      <Animated.View pointerEvents="none" aria-hidden style={[estilos.linea, { backgroundColor: c.marca }, linea]} />
    </Pulsable>
  );
}

const estilos = StyleSheet.create({
  linea: { position: 'absolute', bottom: 0, left: 0, width: 48, height: 2 },
});
