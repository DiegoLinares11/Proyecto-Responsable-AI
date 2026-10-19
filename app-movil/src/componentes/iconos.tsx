// Trazados de Lucide (ISC), conservados sin dependencias adicionales.
// Fuente: https://github.com/lucide-icons/lucide/tree/main/icons
// Licencia: assets/icons/LUCIDE-LICENSE.
import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

type Props = { color: string; tamano?: number };

function Icono({ color, tamano, children }: Props & { children: ReactNode }) {
  return <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </Svg>;
}

export function Persona({ color, tamano = 20 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Circle cx="12" cy="8" r="5" />
        <Path d="M20 21a8 8 0 0 0-16 0" />
  </Icono>;
}

export function Editar({ color, tamano = 20 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <Path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
  </Icono>;
}

export function Derecha({ color, tamano = 20 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M5 12h14" />
        <Path d="m12 5 7 7-7 7" />
  </Icono>;
}

export function Sol({ color, tamano = 16 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Circle cx="12" cy="12" r="4" />
        <Path d="M12 2v2" />
        <Path d="M12 20v2" />
        <Path d="m4.93 4.93 1.41 1.41" />
        <Path d="m17.66 17.66 1.41 1.41" />
        <Path d="M2 12h2" />
        <Path d="M20 12h2" />
        <Path d="m6.34 17.66-1.41 1.41" />
        <Path d="m19.07 4.93-1.41 1.41" />
  </Icono>;
}

export function Luna({ color, tamano = 16 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
  </Icono>;
}

export function Pantalla({ color, tamano = 16 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Rect width="20" height="14" x="2" y="3" rx="2" />
        <Line x1="8" x2="16" y1="21" y2="21" />
        <Line x1="12" x2="12" y1="17" y2="21" />
  </Icono>;
}

export function Asistente({ color, tamano = 16 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
  </Icono>;
}

export function Reloj({ color, tamano = 14 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Circle cx="12" cy="12" r="10" />
        <Path d="M12 6v6h4" />
  </Icono>;
}

export function Diario({ color, tamano = 14 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M15 18h-5" />
        <Path d="M18 14h-8" />
        <Path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" />
        <Rect width="8" height="4" x="10" y="6" rx="1" />
  </Icono>;
}

export function Comprobado({ color, tamano = 14 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <Path d="m9 12 2 2 4-4" />
  </Icono>;
}

export function Contexto({ color, tamano = 14 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Circle cx="12" cy="12" r="10" />
        <Path d="M12 16v-4" />
        <Path d="M12 8h.01" />
  </Icono>;
}

export function Pin({ color, tamano = 14 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <Circle cx="12" cy="10" r="3" />
  </Icono>;
}

export function Abajo({ color, tamano = 12 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="m6 9 6 6 6-6" />
  </Icono>;
}

export function Enviar({ color, tamano = 20 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="m5 12 7-7 7 7" />
        <Path d="M12 19V5" />
  </Icono>;
}

export function Afuera({ color, tamano = 14 }: Props) {
  return <Icono color={color} tamano={tamano}>
        <Path d="M15 3h6v6" />
        <Path d="M10 14 21 3" />
        <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icono>;
}
