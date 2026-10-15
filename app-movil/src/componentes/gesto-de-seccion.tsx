import Svg, { Circle, Path } from 'react-native-svg';
import { useColores } from '@/constants/tema';

const TRAZOS: Record<string, string> = {
  cultura: 'M8 42V26a28 28 0 0 1 56 0v16 M20 42V26a16 16 0 0 1 32 0v16 M32 42V26a4 4 0 0 1 8 0v16',
  deportes: 'M2 42L42 6 M18 42L58 6 M34 42L70 10',
  tecnologia: 'M12 8h48v32H12z M28 8v32 M44 8v32 M12 24h48',
  economia: 'M6 40h14V30h14V20h14V10h18 M6 46h60',
  politica: 'M8 16L36 4l28 12z M8 44h56 M16 22v16 M29 22v16 M43 22v16 M56 22v16',
  guatemala: 'M4 40l20-28 18 28 M32 40l18-22 18 22 M17 22l7 5 6-4',
  general: 'M8 12h56 M8 24h40 M8 36h56 M56 24h8',
};

/** Ornamento de sección: nunca reemplaza el nombre ni comunica un estado. */
export function GestoDeSeccion({ seccion, tamano = 72 }: { seccion: string; tamano?: number }) {
  const c = useColores();
  return (
    <Svg width={tamano} height={tamano * 2 / 3} viewBox="0 0 72 48" aria-hidden>
      {seccion === 'mundo' ? <>
        <Circle cx={36} cy={24} r={21} fill="none" stroke={c.marca} strokeWidth={1.5} />
        <Path d="M15 24h42 M36 3c-17 10-17 32 0 42 M36 3c17 10 17 32 0 42 M19 12h34 M19 36h34" fill="none" stroke={c.marca} strokeWidth={1.5} />
      </> : <Path d={TRAZOS[seccion] ?? TRAZOS.general} fill="none" stroke={c.marca} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />}
    </Svg>
  );
}
