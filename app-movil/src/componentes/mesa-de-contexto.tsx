import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Espacio, ROTULO, Tipos, useColores, useDisposicion } from '@/constants/tema';
import { Asistente, Derecha } from './iconos';

export function MesaDeContexto() {
  const c = useColores();
  const { ancha } = useDisposicion();
  return (
    <View style={[estilos.mesa, { backgroundColor: c.asistenteFondo, borderColor: c.asistente, flexDirection: ancha ? 'row' : 'column' }]}>
      <View style={estilos.contenido}>
        <View style={estilos.rotulo}>
          <Asistente color={c.asistente} />
          <Text style={[ROTULO, { color: c.asistente }]}>Mesa de contexto</Text>
        </View>
        <Text style={[estilos.titulo, { color: c.tinta }]}>La noticia es el comienzo. Entenderla es lo que sigue.</Text>
        <Text style={[estilos.texto, { color: c.tintaSuave }]}>Consultá al asistente de IA para explorar las noticias publicadas y sus fuentes.</Text>
      </View>
      <Pressable
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
  mesa: { padding: Espacio.xl, gap: Espacio.xl, borderTopWidth: 2, alignItems: 'flex-start' },
  contenido: { flex: 1, gap: Espacio.m },
  rotulo: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s },
  titulo: { fontFamily: Tipos.lectura, fontSize: 29, lineHeight: 35, maxWidth: 620 },
  texto: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 22, maxWidth: 580 },
  accion: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espacio.xl, paddingVertical: Espacio.m, borderBottomWidth: 1 },
  accionTexto: { fontFamily: Tipos.textoMedio, fontSize: 14 },
});
