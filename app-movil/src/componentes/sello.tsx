import { StyleSheet, Text, View } from 'react-native';

import { Radio, Tipos, useColores } from '@/constants/tema';
import { Comprobado, Contexto } from './iconos';

/**
 * El sello de veracidad. Igual que en la web: el número nunca va solo —en la
 * lectura de la noticia está el desglose de las cinco señales que lo forman—.
 *
 * Verificada lleva un escudo y su etiqueta. Lo que se publicó por debajo del umbral (lo publicó
 * una persona) se identifica como verificación incompleta. El número se reserva
 * para la ficha de lectura, acompañado de una explicación de qué mide.
 */
export function Sello({
  puntaje,
  compacto = false,
  enDesarrollo = false,
}: {
  puntaje: number | null;
  compacto?: boolean;
  /** Publicada en desarrollo (R-13): lo dice antes que el puntaje. */
  enDesarrollo?: boolean;
}) {
  const c = useColores();

  // Una noticia en desarrollo no lleva el sello de verificada, por alto que sea
  // su puntaje: lo que dice todavía no está confirmado, y eso va primero.
  if (enDesarrollo) {
    return (
      <View
        accessible
        accessibilityLabel="En desarrollo: lo que dice todavía no está confirmado"
        style={[
          estilos.sello,
          compacto && { paddingHorizontal: 0, paddingVertical: 0 },
          { backgroundColor: compacto ? 'transparent' : c.alertaFondo },
        ]}>
        <View aria-hidden><Contexto color={c.alertaTexto} /></View>
        <Text style={[estilos.palabra, { color: c.alertaTexto }]}>En desarrollo</Text>
      </View>
    );
  }

  const verificada = puntaje !== null && puntaje >= 75;

  const Icono = verificada ? Comprobado : Contexto;
  const color = verificada ? c.verificado : c.tintaSuave;

  return (
    <View
      accessible
      accessibilityLabel={`${puntaje === null ? 'Sin evaluar' : verificada ? 'Verificada' : 'Verificación incompleta'}${puntaje === null ? '' : `. Puntaje de verificación: ${puntaje} de 100`}`}
      style={[
        estilos.sello,
        compacto && { paddingHorizontal: 0, paddingVertical: 0 },
        verificada
          ? { backgroundColor: compacto ? 'transparent' : c.verificadoFondo }
          : { borderWidth: 1, borderColor: c.bordeFuerte, paddingVertical: 2 },
      ]}>
      <View aria-hidden><Icono color={color} /></View>
      <Text style={[estilos.palabra, { color: verificada ? c.verificado : c.tintaSuave }]}>
        {puntaje === null ? 'Sin evaluar' : verificada ? 'Verificada' : 'Verificación incompleta'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  sello: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radio.medio,
    alignSelf: 'flex-start',
  },
  palabra: { fontFamily: Tipos.textoMedio, fontSize: 12, lineHeight: 18, flexShrink: 1 },
});
