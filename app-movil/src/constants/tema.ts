// ===========================================================================
// La identidad: un diario que muestra cómo sabe lo que publica
//
// Tres voces, tres letras, para que se distinga a la vista de quién es cada
// cosa (el enunciado lo pide: lo del medio, lo del sistema y lo de la IA):
//   - Newsreader: lo que dice el medio (titulares, resúmenes, texto de la nota).
//   - Public Sans: lo que ordena y explica la plataforma. Con un icono y una
//     etiqueta explícita se identifica lo que escribe el asistente.
//   - IBM Plex Mono: los números de la verificación.
//
// Papel cálido y naranja para la marca. La verificación tiene su propio verde;
// las advertencias usan ámbar para no confundirse con una acción de la app.
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
import { useWindowDimensions } from 'react-native';
import { useApariencia } from '@/lib/apariencia';
import { useHidratado } from '@/lib/hidratacion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const claro = {
  tinta: '#20211E',
  tintaSuave: '#55574F',
  tintaTenue: '#696B62',
  papel: '#FAF8F3',
  papelHundido: '#F0EDE5',
  borde: '#E1DED5',
  bordeFuerte: '#BDB9AE',
  /** Naranja oscuro para texto y enlaces sobre papel. */
  acento: '#AD3B08',
  /** Naranja vivo para detalles de identidad, nunca texto sobre papel. */
  marca: '#FF6113',
  sobreAcento: '#FFFFFF',
  /** Los botones principales van en tinta, no en color. */
  primario: '#20211E',
  sobrePrimario: '#FFFFFF',
  verificado: '#3F591B',
  verificadoFondo: '#E5FF8B',
  asistente: '#075B69',
  asistenteFondo: '#D9F8FC',
  alerta: '#805600',
  alertaFondo: '#F8EDCD',
  alertaTexto: '#654500',
  peligro: '#8F1D14',
  fotoVacia: '#E4E4DA',
  ilustracion: '#292C25',
  ilustracionTexto: '#F7F6F2',
  ilustracionAntetitulo: '#E5FF8B',
};

const oscuro: typeof claro = {
  tinta: '#F0F0E7',
  tintaSuave: '#B8BAAE',
  tintaTenue: '#A0A395',
  papel: '#191A18',
  papelHundido: '#242522',
  borde: '#353732',
  bordeFuerte: '#65685F',
  acento: '#FFAC80',
  marca: '#FF6113',
  sobreAcento: '#191A18',
  primario: '#F0F0E7',
  sobrePrimario: '#191A18',
  verificado: '#E5FF8B',
  verificadoFondo: '#303729',
  asistente: '#8AEAF8',
  asistenteFondo: '#15363B',
  alerta: '#EBC76D',
  alertaFondo: '#382E16',
  alertaTexto: '#F0D798',
  peligro: '#F08A80',
  fotoVacia: '#30352B',
  ilustracion: '#292F22',
  ilustracionTexto: '#F0F0E7',
  ilustracionAntetitulo: '#E5FF8B',
};

export type Paleta = typeof claro;

export function useColores(): Paleta {
  return useApariencia().esquema === 'dark' ? oscuro : claro;
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
  /** Cursiva auxiliar; la IA se identifica por icono y etiqueta, no por cursiva. */
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

/**
 * Los anchos de una pantalla grande (la web, una tableta). La portada usa el
 * espacio como un diario —la principal y una rejilla de notas más chicas—; lo
 * que se lee de corrido va en una columna de texto, como un artículo.
 */
export const ANCHOS = { portada: 1280, lectura: 720, conversacion: 760, modal: 640 } as const;

/** Desde este ancho, la portada pasa de lista a rejilla de diario. */
export const PUNTO_DE_QUIEBRE = 900;

export function useDisposicion(): { ancha: boolean; anchoVentana: number } {
  const { width } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const hidratado = useHidratado();
  const anchoUtil = Math.max(0, width - left - right);
  return { ancha: hidratado && anchoUtil >= PUNTO_DE_QUIEBRE, anchoVentana: hidratado ? anchoUtil : 0 };
}

/** Esquinas: rectas, de diario. */
export const Radio = { chico: 3, medio: 4 } as const;

/** Los rótulos en mayúsculas espaciadas («SALUD · QUETZALTENANGO»). */
export const ROTULO = { fontFamily: Tipos.textoFuerte, fontSize: 11, letterSpacing: 1.6 } as const;
