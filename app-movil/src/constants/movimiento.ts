import { Easing, ReduceMotion } from 'react-native-reanimated';

/** Un ritmo común, sin rebotes ni bucles decorativos. */
export const MOVIMIENTO = {
  breve: { duration: 160, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  presion: { duration: 140, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  entrada: { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
  salida: { duration: 180, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.System },
};
