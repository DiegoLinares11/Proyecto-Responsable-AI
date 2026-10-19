// Iconos de sección de Lucide (ISC): assets/icons/LUCIDE-LICENSE.
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColores } from '@/constants/tema';

const TRAZOS: Record<string, ReactNode> = {
  cultura: <>
        <Path d="m12.296 3.464 3.02 3.956" />
        <Path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" />
        <Path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <Path d="m6.18 5.276 3.1 3.899" />
  </>,
  deportes: <>
        <Path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" />
        <Path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" />
        <Path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" />
        <Path d="M4 22h16" />
        <Path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
        <Path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" />
  </>,
  tecnologia: <>
        <Path d="M12 20v2" />
        <Path d="M12 2v2" />
        <Path d="M17 20v2" />
        <Path d="M17 2v2" />
        <Path d="M2 12h2" />
        <Path d="M2 17h2" />
        <Path d="M2 7h2" />
        <Path d="M20 12h2" />
        <Path d="M20 17h2" />
        <Path d="M20 7h2" />
        <Path d="M7 20v2" />
        <Path d="M7 2v2" />
        <Rect x="4" y="4" width="16" height="16" rx="2" />
        <Rect x="8" y="8" width="8" height="8" rx="1" />
  </>,
  economia: <>
        <Path d="M12 16v5" />
        <Path d="M16 14.639V21" />
        <Path d="M20 10.656V21" />
        <Path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" />
        <Path d="M4 18.463V21" />
        <Path d="M8 14.656V21" />
  </>,
  politica: <>
        <Path d="M10 18v-7" />
        <Path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z" />
        <Path d="M14 18v-7" />
        <Path d="M18 18v-7" />
        <Path d="M3 22h18" />
        <Path d="M6 18v-7" />
  </>,
  guatemala: <>
        <Path d="m8 3 4 8 5-5 5 15H2L8 3z" />
  </>,
  mundo: <>
        <Circle cx="12" cy="12" r="10" />
        <Path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <Path d="M2 12h20" />
  </>,
  general: <>
        <Path d="M15 18h-5" />
        <Path d="M18 14h-8" />
        <Path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2" />
        <Rect width="8" height="4" x="10" y="6" rx="1" />
  </>,
};

/** La sección conserva su etiqueta; este icono es decorativo. */
export function GestoDeSeccion({ seccion, tamano = 72 }: { seccion: string; tamano?: number }) {
  const c = useColores();
  return <Svg width={tamano} height={tamano * 2 / 3} viewBox="0 0 24 24" fill="none" stroke={c.acento} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {TRAZOS[seccion] ?? TRAZOS.general}
  </Svg>;
}
