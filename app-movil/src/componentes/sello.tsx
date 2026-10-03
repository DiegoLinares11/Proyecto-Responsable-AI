import { StyleSheet, Text, View } from 'react-native';

import { Tipos, useColores } from '@/constants/tema';

/**
 * El sello de veracidad. Igual que en la web: el número nunca va solo —en la
 * lectura de la noticia está el desglose de las cinco señales que lo forman—.
 */
export function Sello({ puntaje }: { puntaje: number | null }) {
  const c = useColores();
  const verificada = puntaje !== null && puntaje >= 75;
  const color = verificada ? c.verificado : c.alerta;
  const texto = puntaje === null ? 'SIN EVALUAR' : verificada ? `VERIFICADA · ${puntaje}` : `VERACIDAD ${puntaje}`;

  return (
    <View style={[estilos.sello, { backgroundColor: color + '1F' }]}>
      <Text style={[estilos.texto, { color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  sello: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, alignSelf: 'flex-start' },
  texto: { fontFamily: Tipos.texto, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
});
