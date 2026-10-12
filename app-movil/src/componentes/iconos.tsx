// Los pocos íconos de la app, de trazo, en vez de emojis: un emoji cambia de
// dibujo según el teléfono y no toma el color del tema.

import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color: string; tamano?: number };

export function Pin({ color, tamano = 14 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={9.5} r={2.5} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function Abajo({ color, tamano = 12 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M6 9l6 6 6-6" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function Enviar({ color, tamano = 20 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path
        d="M12 19V5 M6 11l6-6 6 6"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Afuera({ color, tamano = 14 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path
        d="M14 5h5v5 M19 5l-8 8 M17 14v5H5V7h5"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
