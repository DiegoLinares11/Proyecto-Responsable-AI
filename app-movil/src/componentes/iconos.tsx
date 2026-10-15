// Los pocos íconos de la app, de trazo, en vez de emojis: un emoji cambia de
// dibujo según el teléfono y no toma el color del tema.

import Svg, { Circle, Path } from 'react-native-svg';

type Props = { color: string; tamano?: number };

export function Derecha({ color, tamano = 20 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M4 12h16 M13 5l7 7-7 7" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Sol({ color, tamano = 16 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function Luna({ color, tamano = 16 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function Pantalla({ color, tamano = 16 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M3 4h18v13H3z M12 17v4 M8 21h8" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export function Asistente({ color, tamano = 16 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 9h8 M8 13h5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Metadatos: una sola familia de trazo, acompañada siempre por texto. */
export function Reloj({ color, tamano = 14 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M12 7v5l3 2" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function Diario({ color, tamano = 14 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export function Comprobado({ color, tamano = 14 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M12 3l8 3v6c0 5-8 9-8 9S4 17 4 12V6z M8 11l3 3 5-5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Contexto({ color, tamano = 14 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M12 11v6 M12 7v.1" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

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
