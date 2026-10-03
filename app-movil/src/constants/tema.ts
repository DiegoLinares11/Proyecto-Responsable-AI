// Los mismos colores y la misma idea tipográfica que el portal web: los
// titulares en serif, todo lo que calcula la plataforma en sans. Separa a la
// vista lo que el medio afirma de lo que medimos nosotros.

import { Platform, useColorScheme } from 'react-native';

const claro = {
  tinta: '#16181d',
  tintaSuave: '#5a6072',
  tintaTenue: '#878da0',
  papel: '#ffffff',
  papelHundido: '#f4f5f8',
  borde: '#e2e4ec',
  acento: '#1f5fd0',
  sobreAcento: '#ffffff',
  verificado: '#0f7a4f',
  alerta: '#b4530b',
  peligro: '#b3261e',
};

const oscuro: typeof claro = {
  tinta: '#e9eaf0',
  tintaSuave: '#a0a6b8',
  tintaTenue: '#777e92',
  papel: '#101218',
  papelHundido: '#1a1d25',
  borde: '#2a2e3a',
  acento: '#7aa5f0',
  sobreAcento: '#0b1220',
  verificado: '#4cc38a',
  alerta: '#e2a03f',
  peligro: '#f2726a',
};

export type Paleta = typeof claro;

export function useColores(): Paleta {
  return useColorScheme() === 'dark' ? oscuro : claro;
}

export const Tipos = {
  titulares: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, "Times New Roman", serif',
  }),
  texto: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  }),
};

export const Espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
