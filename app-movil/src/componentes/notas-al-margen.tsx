import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Espacio, ROTULO, Tipos, useColores } from '@/constants/tema';
import { Afuera, Asistente, Comprobado } from './iconos';

export function NotasAlMargen({ fuente, original, verificar, consultar, compacta = false }: {
  fuente: string; original?: () => void; verificar: () => void; consultar: () => void; compacta?: boolean;
}) {
  const c = useColores();
  const notas = [
    ...(original ? [{ texto: 'Medio original', detalle: fuente, Icono: Afuera, accion: original, enlace: true }] : []),
    { texto: 'Ver las comprobaciones', detalle: 'Fuente y evidencia', Icono: Comprobado, accion: verificar, enlace: false },
    { texto: 'Consultar esta noticia', detalle: 'Preparar pregunta al asistente', Icono: Asistente, accion: consultar, enlace: true },
  ];
  return (
    <View style={[estilos.margen, { borderColor: c.borde }, compacta && { marginBottom: Espacio.xl }]}>
      <Text style={[ROTULO, { color: c.tintaTenue }]}>Notas al margen</Text>
      <View style={compacta ? estilos.compacta : undefined}>
        {notas.map(({ texto, detalle, Icono, accion, enlace }) => (
          <Pressable key={texto} onPress={accion} accessibilityRole={enlace ? 'link' : 'button'} accessibilityLabel={enlace ? texto : 'Ir a las comprobaciones'}
            style={({ pressed }) => [estilos.nota, { borderColor: c.borde, opacity: pressed ? 0.65 : 1 }]}>
            <Icono color={c.acento} tamano={17} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[estilos.titulo, { color: c.tinta }]}>{texto}</Text>
              {!compacta ? <Text style={[estilos.detalle, { color: c.tintaSuave }]}>{detalle}</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  margen: { gap: Espacio.m, paddingTop: Espacio.l, borderTopWidth: 3 },
  compacta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Espacio.l },
  nota: { flexDirection: 'row', alignItems: 'center', gap: Espacio.m, minHeight: 52, paddingVertical: Espacio.l, borderBottomWidth: 1, maxWidth: '100%' },
  titulo: { fontFamily: Tipos.textoMedio, fontSize: 13, lineHeight: 22, flexShrink: 1 },
  detalle: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 20 },
});
