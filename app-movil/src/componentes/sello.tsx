import { StyleSheet, Text, View } from 'react-native';

import { Radio, Tipos, useColores } from '@/constants/tema';

/**
 * El sello de veracidad. Igual que en la web: el número nunca va solo —en la
 * lectura de la noticia está el desglose de las cinco señales que lo forman—.
 *
 * Verificada va en celeste. Lo que se publicó por debajo del umbral (lo publicó
 * una persona) va sin color: no es «verificada», y tampoco es una alerta.
 */
export function Sello({ puntaje, compacto = false }: { puntaje: number | null; compacto?: boolean }) {
  const c = useColores();
  const verificada = puntaje !== null && puntaje >= 75;

  if (compacto) {
    return (
      <Text
        style={[estilos.compacto, { color: verificada ? c.verificado : c.tintaSuave }]}
        accessibilityLabel={puntaje === null ? 'Sin evaluar' : `Veracidad ${puntaje} de 100`}>
        {puntaje === null ? '—' : `${verificada ? '✓ ' : ''}${puntaje}`}
      </Text>
    );
  }

  return (
    <View
      style={[
        estilos.sello,
        verificada
          ? { backgroundColor: c.verificadoFondo }
          : { borderWidth: 1, borderColor: c.bordeFuerte, paddingVertical: 2 },
      ]}>
      <Text style={[estilos.palabra, { color: verificada ? c.verificado : c.tintaSuave }]}>
        {puntaje === null ? 'SIN EVALUAR' : verificada ? 'VERIFICADA' : 'VERACIDAD'}
      </Text>
      {puntaje !== null ? (
        <Text style={[estilos.numero, { color: verificada ? c.verificado : c.tintaSuave }]}>{puntaje}</Text>
      ) : null}
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
  palabra: { fontFamily: Tipos.textoFuerte, fontSize: 11, letterSpacing: 0.9 },
  numero: { fontFamily: Tipos.numeros, fontSize: 11 },
  compacto: { fontFamily: Tipos.numeros, fontSize: 12 },
});
