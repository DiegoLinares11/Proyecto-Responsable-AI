import { StyleSheet, Text, View } from 'react-native';

import { Radio, Tipos, useColores } from '@/constants/tema';
import { Comprobado, Contexto } from './iconos';

/**
 * El sello de veracidad. Igual que en la web: el número nunca va solo —en la
 * lectura de la noticia está el desglose de las cinco señales que lo forman—.
 *
 * Verificada va en verde. Lo que se publicó por debajo del umbral (lo publicó
 * una persona) se identifica como verificación incompleta. El número se reserva
 * para la ficha de lectura, acompañado de una explicación de qué mide.
 */
export function Sello({ puntaje, compacto = false }: { puntaje: number | null; compacto?: boolean }) {
  const c = useColores();
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radio.chico,
    alignSelf: 'flex-start',
  },
  palabra: { fontFamily: Tipos.textoMedio, fontSize: 12, lineHeight: 18, flexShrink: 1 },
});
