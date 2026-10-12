// En la web no hay barra nativa: esta versión existe para poder ver la app desde
// un navegador. En el teléfono se usa pestanas.tsx.
//
// En una pantalla angosta, la barra va abajo, como en el teléfono. En una ancha
// va arriba, como la cabecera de un diario: el logo y las secciones.
//
// Ojo: `Tabs` encuentra las pantallas leyendo los `TabTrigger` que son hijos
// DIRECTOS de la lista. Envolverlos en un componente o en otra vista hace que
// no los vea («Couldn't find any screens for the navigator»). Por eso van en un
// arreglo, sin fragmentos, y el centrado de la cabecera se hace con márgenes.

import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Logotipo } from '@/componentes/marca';
import { ANCHOS, Espacio, Tipos, useColores, useDisposicion } from '@/constants/tema';

function Boton({ children, isFocused, ancha, ...props }: TabTriggerSlotProps & { ancha?: boolean }) {
  const c = useColores();
  return (
    <Pressable
      {...props}
      style={[
        ancha ? estilos.botonArriba : estilos.botonAbajo,
        ancha
          ? { borderBottomColor: isFocused ? c.marca : 'transparent' }
          : { borderTopColor: isFocused ? c.marca : 'transparent' },
      ]}>
      <Text
        style={{
          color: isFocused ? c.tinta : c.tintaSuave,
          fontFamily: isFocused ? Tipos.textoFuerte : Tipos.textoMedio,
          fontSize: ancha ? 15 : 13,
        }}>
        {children}
      </Text>
    </Pressable>
  );
}

/** Abajo, el orden del teléfono (el chat primero, como pide el enunciado);
 *  arriba, el de un diario: la portada primero. */
function botones(ancha: boolean) {
  const chat = (
    <TabTrigger key="index" name="index" href="/" asChild>
      <Boton ancha={ancha}>Chat</Boton>
    </TabTrigger>
  );
  const portada = (
    <TabTrigger key="feed" name="feed" href="/feed" asChild>
      <Boton ancha={ancha}>Portada</Boton>
    </TabTrigger>
  );
  const perfil = (
    <TabTrigger key="perfil" name="perfil" href="/perfil" asChild>
      <Boton ancha={ancha}>Perfil</Boton>
    </TabTrigger>
  );
  return ancha ? [portada, chat, perfil] : [chat, portada, perfil];
}

export default function Pestanas() {
  const c = useColores();
  const { ancha, anchoVentana } = useDisposicion();

  if (ancha) {
    // El contenido de la cabecera mide lo mismo que la portada (ANCHOS.portada)
    // y queda centrado; la raya de abajo cruza toda la ventana.
    const margen = Math.max(Espacio.xxl, (anchoVentana - ANCHOS.portada) / 2 + Espacio.xxl);
    return (
      <Tabs>
        <TabList asChild>
          {/* `asChild` no acepta un arreglo de estilos: hay que aplanarlo. */}
          <View
            style={StyleSheet.flatten([
              estilos.cabecera,
              { backgroundColor: c.papel, borderBottomColor: c.bordeFuerte, paddingHorizontal: margen },
            ])}>
            <Logotipo />
            <View style={{ flex: 1 }} />
            {botones(true)}
          </View>
        </TabList>
        <TabSlot style={{ flex: 1 }} />
      </Tabs>
    );
  }

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View style={StyleSheet.flatten([estilos.barra, { backgroundColor: c.papel, borderTopColor: c.bordeFuerte }])}>
          {botones(false)}
        </View>
      </TabList>
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', borderTopWidth: 1 },
  botonAbajo: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, borderTopWidth: 2, marginTop: -1 },

  cabecera: { flexDirection: 'row', alignItems: 'stretch', minHeight: 68, borderBottomWidth: 1 },
  botonArriba: { justifyContent: 'center', paddingHorizontal: Espacio.l, borderBottomWidth: 3, marginBottom: -1 },
});
