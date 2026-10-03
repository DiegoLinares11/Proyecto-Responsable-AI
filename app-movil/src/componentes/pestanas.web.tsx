// En la web no hay barra nativa: esta versión existe para poder revisar la app
// desde un navegador durante el desarrollo. En el teléfono se usa pestanas.tsx.

import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Tipos, useColores } from '@/constants/tema';

function Boton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const c = useColores();
  return (
    <Pressable {...props} style={estilos.boton}>
      <Text
        style={[
          estilos.etiqueta,
          { color: isFocused ? c.acento : c.tintaSuave, fontWeight: isFocused ? '700' : '500' },
        ]}>
        {children}
      </Text>
    </Pressable>
  );
}

export default function Pestanas() {
  const c = useColores();
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        {/* `asChild` no acepta un arreglo de estilos: hay que aplanarlo. */}
        <View
          style={StyleSheet.flatten([estilos.barra, { backgroundColor: c.papel, borderTopColor: c.borde }])}>
          <TabTrigger name="index" href="/" asChild>
            <Boton>Chat</Boton>
          </TabTrigger>
          <TabTrigger name="feed" href="/feed" asChild>
            <Boton>Portada</Boton>
          </TabTrigger>
          <TabTrigger name="perfil" href="/perfil" asChild>
            <Boton>Perfil</Boton>
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 6 },
  boton: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  etiqueta: { fontSize: 13, fontFamily: Tipos.texto },
});
