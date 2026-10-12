// ===========================================================================
// La identidad: un diario que muestra cómo sabe lo que publica
//
// Tres voces, tres letras, para que se distinga a la vista de quién es cada
// cosa (el enunciado lo pide: lo del medio, lo del sistema y lo de la IA):
//   - Newsreader: lo que dice el medio (titulares, resúmenes, texto de la nota).
//   - Public Sans: lo que ordena y explica la plataforma. En cursiva y con la
//     etiqueta «IA», lo que escribe el asistente.
//   - IBM Plex Mono: los números de la verificación.
//
// El celeste viene de la bandera de Guatemala y marca lo verificado. Lo no
// confirmado va en naranja y lo desmentido en rojo oscuro: se distinguen por
// tono y también por claridad, para quien no distingue colores.
//
// Cada peso es su propia familia (Newsreader_600SemiBold…), sin fontWeight: con
// fuentes cargadas, Android ignora el peso o cae a la fuente del sistema.
// ===========================================================================

import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_600SemiBold,
} from '@expo-google-fonts/newsreader';
import {
  PublicSans_400Regular,
  PublicSans_400Regular_Italic,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import { useColorScheme } from 'react-native';

const claro = {
  tinta: '#12161C',
  tintaSuave: '#4A5260',
  tintaTenue: '#6B7380',
  papel: '#FFFFFF',
  papelHundido: '#F1F3F5',
  borde: '#E1E5EA',
  bordeFuerte: '#C3CAD3',
  /** Celeste tinta: enlaces, antetítulos y todo lo verificado. */
  acento: '#1A62A6',
  /** Celeste sello: el logo y la pestaña activa. Decorativo, nunca texto. */
  marca: '#3B8FD0',
  sobreAcento: '#FFFFFF',
  /** Los botones principales van en tinta, no en color. */
  primario: '#12161C',
  sobrePrimario: '#FFFFFF',
  verificado: '#1A62A6',
  verificadoFondo: '#E4F0FA',
  alerta: '#B84E08',
  alertaFondo: '#FBEBDD',
  alertaTexto: '#6B2E05',
  peligro: '#8F1D14',
  fotoVacia: '#DCE3EA',
  ilustracion: '#12161C',
  ilustracionTexto: '#FFFFFF',
  ilustracionAntetitulo: '#7DB9EA',
};

const oscuro: typeof claro = {
  tinta: '#E8ECF1',
  tintaSuave: '#A1AAB6',
  tintaTenue: '#8A93A0',
  papel: '#0D1116',
  papelHundido: '#171C23',
  borde: '#262D37',
  bordeFuerte: '#3A4350',
  acento: '#7DB9EA',
  marca: '#3B8FD0',
  sobreAcento: '#0D1116',
  primario: '#E8ECF1',
  sobrePrimario: '#0D1116',
  verificado: '#9BCBF2',
  verificadoFondo: '#12304A',
  alerta: '#F2A65A',
  alertaFondo: '#3A2410',
  alertaTexto: '#F6C995',
  peligro: '#F08A80',
  fotoVacia: '#2A323D',
  ilustracion: '#1B2530',
  ilustracionTexto: '#FFFFFF',
  ilustracionAntetitulo: '#7DB9EA',
};

export type Paleta = typeof claro;

export function useColores(): Paleta {
  return useColorScheme() === 'dark' ? oscuro : claro;
}

/** Las familias, una por peso. Los nombres son las llaves de FUENTES. */
export const Tipos = {
  /** Titulares del medio. */
  titular: 'Newsreader_600SemiBold',
  /** Resúmenes y texto de la nota. */
  lectura: 'Newsreader_400Regular',
  /** La ilustración tipográfica de una nota sin foto. */
  lecturaCursiva: 'Newsreader_400Regular_Italic',
  /** La interfaz. */
  texto: 'PublicSans_400Regular',
  /** Lo que escribe la IA. */
  textoCursiva: 'PublicSans_400Regular_Italic',
  textoMedio: 'PublicSans_600SemiBold',
  textoFuerte: 'PublicSans_700Bold',
  /** Puntajes, señales y factores. */
  numeros: 'IBMPlexMono_500Medium',
} as const;

/** Lo que carga la raíz antes de mostrar la app (src/app/_layout.tsx). */
export const FUENTES = {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_600SemiBold,
  PublicSans_400Regular,
  PublicSans_400Regular_Italic,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  IBMPlexMono_500Medium,
};

export const Espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

/** Esquinas: rectas, de diario. */
export const Radio = { chico: 3, medio: 4 } as const;

/** Los rótulos en mayúsculas espaciadas («SALUD · QUETZALTENANGO»). */
export const ROTULO = { fontFamily: Tipos.textoFuerte, fontSize: 11, letterSpacing: 1.6 } as const;
