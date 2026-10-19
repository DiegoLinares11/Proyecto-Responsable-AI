// ===========================================================================
// NEXO · identidad editorial compartida por iOS, Android y web.
//
// Manrope para titulares; Inter para lectura, interfaz y cifras.
// El asistente conserva su icono y etiqueta explícita.
// Google Sans Medium se reserva para el botón oficial de acceso con Google.
//
// Naranja, negro y neutros. Los estados conservan texto e icono además del color.
//
// Cada peso es su propia familia (Inter_600SemiBold…), sin fontWeight: con
// fuentes cargadas, Android ignora el peso o cae a la fuente del sistema.
// ===========================================================================

import { Platform, useWindowDimensions } from 'react-native';
import { useApariencia } from '@/lib/apariencia';
import { useHidratado } from '@/lib/hidratacion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Valores aprobados en la guía de identidad NEXO. */
export const PALETA_EDITORIAL = {
  naranja: '#FF6B00', negro: '#111318', blanco: '#FFFFFF', grisClaro: '#F3F4F6',
};

const claro = {
  tinta: PALETA_EDITORIAL.negro,
  tintaSuave: '#5B616E', tintaTenue: '#626A78',
  papel: PALETA_EDITORIAL.blanco, papelHundido: PALETA_EDITORIAL.grisClaro,
  superficieElevada: '#FFFFFF', borde: '#E5E7EB', bordeFuerte: '#7D8592',
  acento: '#B94600', marca: PALETA_EDITORIAL.naranja, sobreMarca: PALETA_EDITORIAL.negro,
  sobreAcento: '#FFFFFF',
  primario: '#C94F00', sobrePrimario: '#FFFFFF',
  verificado: '#16803D', verificadoFondo: '#F0FDF4',
  asistente: '#303641', asistenteFondo: PALETA_EDITORIAL.grisClaro,
  alerta: '#84500A', alertaFondo: '#FFF8E6', alertaTexto: '#734508',
  peligro: '#B42318', peligroFondo: '#FFF1F0', fotoVacia: '#E5E7EB',
  ilustracion: PALETA_EDITORIAL.negro, ilustracionTexto: '#FFFFFF',
  ilustracionAntetitulo: '#D1D5DB',
  editorial: PALETA_EDITORIAL.negro, sobreEditorial: '#FFFFFF',
  editorialSuave: '#D1D5DB', editorialBorde: '#454B56', marcaSuave: '#FFF1E7',
};

const oscuro: typeof claro = {
  tinta: '#F9FAFB', tintaSuave: '#B8BEC9', tintaTenue: '#A6AEBB',
  papel: PALETA_EDITORIAL.negro, papelHundido: '#1B1E24', superficieElevada: '#252A32',
  borde: '#343A45', bordeFuerte: '#697587',
  acento: '#FF8A3D', marca: PALETA_EDITORIAL.naranja, sobreMarca: PALETA_EDITORIAL.negro,
  sobreAcento: PALETA_EDITORIAL.negro,
  primario: PALETA_EDITORIAL.naranja, sobrePrimario: PALETA_EDITORIAL.negro,
  verificado: '#86EFAC', verificadoFondo: '#142A1D',
  asistente: '#E5E7EB', asistenteFondo: '#1B1E24',
  alerta: '#F1C783', alertaFondo: '#302719', alertaTexto: '#F3D6A9',
  peligro: '#FDA29B', peligroFondo: '#351C1B', fotoVacia: '#252A32',
  ilustracion: '#111318', ilustracionTexto: '#FFFFFF', ilustracionAntetitulo: '#D1D5DB',
  editorial: '#111318', sobreEditorial: '#FFFFFF',
  editorialSuave: '#D1D5DB', editorialBorde: '#454B56', marcaSuave: '#332317',
};

export type Paleta = typeof claro;

export function useColores(): Paleta {
  return useApariencia().esquema === 'dark' ? oscuro : claro;
}

/** Web admite una pila de respaldo; iOS y Android resuelven la familia nativa. */
const familia = (nombre: string) => Platform.OS === 'web'
  ? `"${nombre}", system-ui, -apple-system, "Segoe UI", sans-serif`
  : nombre;

/** Las familias conservan sus nombres públicos y los pesos empaquetados. */
export const Tipos = {
  /** Titulares del medio. */
  titular: familia('Manrope_700Bold'),
  titularMedio: familia('Manrope_600SemiBold'),
  /** Resúmenes y texto de la nota. */
  lectura: familia('Inter_400Regular'),
  /** La ilustración tipográfica de una nota sin foto. */
  lecturaCursiva: familia('Inter_400Regular_Italic'),
  /** La interfaz. */
  texto: familia('Inter_400Regular'),
  /** Cursiva auxiliar; la IA se identifica por icono y etiqueta, no por cursiva. */
  textoCursiva: familia('Inter_400Regular_Italic'),
  textoMedio: familia('Inter_600SemiBold'),
  textoFuerte: familia('Inter_700Bold'),
  /** Puntajes, señales y factores. */
  numeros: familia('Inter_600SemiBold'),
  google: familia('GoogleSans_500Medium'),
} as const;

/** Lo que carga la raíz antes de mostrar la app (src/app/_layout.tsx). */
export const FUENTES = {
  Manrope_600SemiBold: require('../../assets/fonts/Manrope_600SemiBold.ttf'),
  Manrope_700Bold: require('../../assets/fonts/Manrope_700Bold.ttf'),
  Inter_400Regular: require('../../assets/fonts/Inter_400Regular.ttf'),
  Inter_400Regular_Italic: require('../../assets/fonts/Inter_400Regular_Italic.ttf'),
  Inter_600SemiBold: require('../../assets/fonts/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('../../assets/fonts/Inter_700Bold.ttf'),
  GoogleSans_500Medium: require('../../assets/fonts/GoogleSans_500Medium.ttf'),
};

export const Espacio = { xs: 4, s: 8, m: 12, l: 16, pagina: 20, xl: 24, xxl: 32, xxxl: 40, amplio: 48 } as const;

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

/** Radios discretos: fotos y controles, sin convertir el diario en tarjetas. */
export const Radio = { chico: 8, medio: 12, amplio: 16 } as const;

/** Los rótulos en mayúsculas espaciadas («SALUD · QUETZALTENANGO»). */
export const ROTULO = { fontFamily: Tipos.textoMedio, fontSize: 12, lineHeight: 18, letterSpacing: 0.9 } as const;
