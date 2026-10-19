import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useColores } from '@/constants/tema';
import { useApariencia } from '@/lib/apariencia';

const LOGO = require('../../assets/marca/nexo-horizontal.png');
const ICONO = require('../../assets/marca/nexo-icono.png');

// El PNG individual original se conserva intacto. Esta ventana solo descuenta
// su margen transparente; no se traza, estira ni reconstruye el símbolo.
const ARTE = { ancho: 2172, alto: 724, x: 136, y: 110, anchoVisible: 1902, altoVisible: 544, anchoSimbolo: 632 };

type Props = {
  variante?: 'horizontal' | 'simbolo' | 'icono';
  tono?: 'automatico' | 'claro' | 'oscuro' | 'monocromo' | 'naranja';
  tamano?: number;
  etiqueta?: string;
  tinta?: string;
};

/** Marca compartida. El tamaño indica la altura visible, sin el espacio libre. */
export function MarcaNexo({ variante = 'horizontal', tono = 'automatico', tamano = 30, etiqueta, tinta }: Props) {
  const c = useColores();
  const { esquema } = useApariencia();
  const monocroma = tinta ?? (tono === 'oscuro' || tono === 'naranja' || (tono === 'automatico' && esquema === 'dark')
    ? '#FFFFFF' : tono === 'monocromo' ? c.tinta : undefined);
  const escala = tamano / ARTE.altoVisible;
  const ancho = variante === 'icono' ? tamano : escala * (variante === 'simbolo' ? ARTE.anchoSimbolo : ARTE.anchoVisible);
  return (
    <View
      style={{ padding: tamano / 4, flexShrink: 0 }}
      accessible={etiqueta !== undefined}
      accessibilityLabel={etiqueta}
      accessibilityRole={etiqueta ? 'image' : undefined}
      aria-hidden={etiqueta === undefined}>
      <View style={[estilos.ventana, { width: ancho, height: tamano }]}>
        <Image
          source={variante === 'icono' ? ICONO : LOGO}
          alt=""
          contentFit="contain"
          tintColor={variante === 'icono' ? undefined : monocroma}
          style={variante === 'icono' ? { width: tamano, height: tamano } : {
            position: 'absolute', width: ARTE.ancho * escala, height: ARTE.alto * escala,
            left: -ARTE.x * escala, top: -ARTE.y * escala,
          }}
        />
      </View>
    </View>
  );
}

/** Conserva el contrato de las ilustraciones y los sellos existentes. */
export function SelloMarca({ tamano = 30, etiqueta, tinta }: { tamano?: number; etiqueta?: string; tinta?: string }) {
  return <MarcaNexo variante="simbolo" tamano={tamano} etiqueta={etiqueta} tinta={tinta} />;
}

/** Encabezado accesible; el dibujo conserva la tipografía del logo suministrado. */
export function Logotipo({ grande = false }: { grande?: boolean }) {
  return <View style={estilos.fila} accessible accessibilityRole="header" accessibilityLabel="NEXO">
    <MarcaNexo tamano={grande ? 40 : 30} />
  </View>;
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  ventana: { overflow: 'hidden' },
});
