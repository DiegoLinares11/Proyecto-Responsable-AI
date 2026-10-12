// El sello de la marca y el logotipo. El sello es un check dentro de dos
// anillos: el de afuera en celeste, el de adentro en tinta. Es lo mismo que la
// plataforma le pone a una noticia cuando pasa la verificación.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Tipos, useColores } from '@/constants/tema';

export function SelloMarca({ tamano = 30, etiqueta }: { tamano?: number; etiqueta?: string }) {
  const c = useColores();
  // Sin etiqueta es decoración: ni `accessible={false}`, que en la web llega
  // al DOM como un atributo inválido.
  const accesible = etiqueta === undefined ? {} : { accessible: true, accessibilityLabel: etiqueta };
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 64 64" {...accesible}>
      <Circle cx={32} cy={32} r={29} fill="none" stroke={c.marca} strokeWidth={4} />
      <Circle cx={32} cy={32} r={22} fill="none" stroke={c.tinta} strokeWidth={1.5} />
      <Path
        d="M22 33 L29 40 L43 24"
        fill="none"
        stroke={c.tinta}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** «NOTICIAS / Verificadas», con el sello al lado. */
export function Logotipo({ grande = false }: { grande?: boolean }) {
  const c = useColores();
  return (
    <View style={estilos.fila} accessible accessibilityRole="header" accessibilityLabel="Noticias Verificadas">
      <SelloMarca tamano={grande ? 44 : 30} />
      <View>
        <Text style={[estilos.antes, { color: c.tintaSuave, fontSize: grande ? 11 : 9 }]}>NOTICIAS</Text>
        <Text style={[estilos.nombre, { color: c.tinta, fontSize: grande ? 32 : 22, lineHeight: grande ? 34 : 24 }]}>
          Verificadas
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  antes: { fontFamily: Tipos.textoFuerte, letterSpacing: 2.2 },
  nombre: { fontFamily: Tipos.titular },
});
