import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Espacio, ROTULO, Tipos, useColores, useDisposicion } from '@/constants/tema';
import { Asistente, Derecha } from './iconos';
import { ACCESO_DE_ENLACE } from './acceso-de-enlace';

export function MesaDeContexto() {
  const c = useColores();
  const { ancha } = useDisposicion();
  return (
    <View style={[estilos.mesa, { backgroundColor: c.asistenteFondo, borderColor: c.borde, flexDirection: ancha ? 'row' : 'column' }]}>
      <View style={estilos.contenido}>
        <View style={estilos.rotulo}>
          <Asistente color={c.asistente} />
          <Text style={[ROTULO, { color: c.asistente }]}>Mesa de contexto</Text>
        </View>
        <Text style={[estilos.titulo, { color: c.tinta }]}>La noticia es el comienzo. Entenderla es lo que sigue.</Text>
        <Text style={[estilos.texto, { color: c.tintaSuave }]}>Consultá al asistente de IA para explorar las noticias publicadas y sus fuentes.</Text>
      </View>
      <Pressable
        {...ACCESO_DE_ENLACE}
        onPress={() => router.navigate('/')}
        accessibilityRole="link"
        style={({ pressed }) => [estilos.accion, { borderColor: c.asistente, opacity: pressed ? 0.65 : 1 }]}>
        <Text style={[estilos.accionTexto, { color: c.asistente }]}>Abrir el asistente</Text>
        <Derecha color={c.asistente} tamano={24} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  mesa: { padding: Espacio.l, gap: Espacio.l, borderWidth: 1, alignItems: 'flex-start', borderRadius: 12 },
  contenido: { flex: 1, minWidth: 0, gap: Espacio.s },
  rotulo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.s },
  titulo: { fontFamily: Tipos.titularMedio, fontSize: 20, lineHeight: 27, letterSpacing: -0.4, maxWidth: 620 },
  texto: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 22, maxWidth: 580 },
  accion: { minHeight: 48, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espacio.l, padding: Espacio.m, borderWidth: 1, borderRadius: 10 },
  accionTexto: { fontFamily: Tipos.textoMedio, fontSize: 13, lineHeight: 21, flexShrink: 1 },
});
