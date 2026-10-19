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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logotipo } from '@/componentes/marca';
import { MenuEditorial } from '@/componentes/menu-editorial';
import { Asistente, Diario, Editar, Persona } from '@/componentes/iconos';
import { ANCHOS, Espacio, Tipos, useColores, useDisposicion } from '@/constants/tema';
import { usePermisos } from '@/lib/permisos';

const ICONOS: Record<string, typeof Diario> = { Chat: Asistente, Portada: Diario, Perfil: Persona, Redacción: Editar };

function Boton({
  children,
  isFocused,
  ancha,
  oculto,
  ...props
}: TabTriggerSlotProps & { ancha?: boolean; oculto?: boolean }) {
  const c = useColores();
  const Icono = typeof children === 'string' ? ICONOS[children] : undefined;
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        ancha ? estilos.botonArriba : estilos.botonAbajo,
        ancha
          ? { borderBottomColor: isFocused ? c.marca : 'transparent' }
          : { borderTopColor: isFocused ? c.marca : 'transparent' },
        oculto && { display: 'none' },
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      {!ancha && Icono ? <View aria-hidden><Icono color={isFocused ? c.acento : c.tintaSuave} tamano={22} /></View> : null}
      <Text
        style={{
          color: isFocused ? c.acento : c.tintaSuave,
          fontFamily: isFocused ? Tipos.textoFuerte : Tipos.textoMedio,
          fontSize: ancha ? 14 : 11,
          lineHeight: ancha ? 22 : 17,
        }}>
        {children}
      </Text>
    </Pressable>
  );
}

/** Abajo, el orden del teléfono (el chat primero, como pide el enunciado);
 *  arriba, el de un diario: la portada primero. */
function botones(ancha: boolean, conRedaccion: boolean) {
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
  // El botón, solo para cuentas con algún permiso de la redacción. La ruta
  // existe siempre: si dependiera del permiso, abrir /redaccion directo
  // mandaría al chat, porque el permiso llega después del primer dibujo. La
  // pantalla misma le explica al lector que no tiene acceso.
  const redaccion = (
    <TabTrigger key="redaccion" name="redaccion" href="/redaccion" asChild>
      <Boton ancha={ancha} oculto={!conRedaccion}>
        Redacción
      </Boton>
    </TabTrigger>
  );
  return ancha ? [portada, chat, redaccion, perfil] : [chat, portada, redaccion, perfil];
}

export default function Pestanas() {
  const c = useColores();
  const { ancha } = useDisposicion();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.papel }} edges={ancha ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}>
      <ContenidoPestanas />
    </SafeAreaView>
  );
}

function ContenidoPestanas() {
  const c = useColores();
  const { ancha, anchoVentana } = useDisposicion();
  const { redaccion } = usePermisos();

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
              { backgroundColor: c.papel, borderTopColor: c.editorial, borderBottomColor: c.borde, paddingHorizontal: margen },
            ])}>
            <Logotipo />
            <View style={{ flex: 1 }} />
            {botones(true, redaccion)}
            <MenuEditorial />
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
        <SafeAreaView edges={['bottom']} style={StyleSheet.flatten([estilos.barra, { backgroundColor: c.papel, borderTopColor: c.borde }])}>
          {botones(false, redaccion)}
          <MenuEditorial barra />
        </SafeAreaView>
      </TabList>
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', borderTopWidth: 1 },
  botonAbajo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 64, paddingVertical: 8 },

  cabecera: { flexDirection: 'row', alignItems: 'stretch', minHeight: 76, borderBottomWidth: 1 },
  botonArriba: { justifyContent: 'center', paddingHorizontal: Espacio.xl, borderBottomWidth: 2, marginBottom: -1 },
});
