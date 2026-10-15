import { router, usePathname, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { MOVIMIENTO } from '@/constants/movimiento';
import { ANCHOS, Espacio, ROTULO, Tipos, useColores, useDisposicion } from '@/constants/tema';
import { usePermisos } from '@/lib/permisos';
import { Asistente, Derecha, Diario, Pantalla } from './iconos';
import { Logotipo } from './marca';
import { SelectorDeApariencia } from './selector-de-apariencia';

/** La misma hoja de navegación se abre desde escritorio, móvil web y la app. */
export function MenuEditorial({ barra = false }: { barra?: boolean }) {
  const c = useColores();
  const { ancha } = useDisposicion();
  const { redaccion } = usePermisos();
  const ruta = usePathname();
  const [montado, setMontado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const progreso = useSharedValue(0);
  const panel = useAnimatedStyle(() => ({ opacity: progreso.value, transform: [{ translateY: (1 - progreso.value) * -20 }] }));
  function abrir() {
    setMontado(true);
    setAbierto(true);
    progreso.set(withTiming(1, MOVIMIENTO.entrada));
  }
  function terminarCierre() { setMontado(false); }
  function cerrar() {
    setAbierto(false);
    progreso.set(withTiming(0, MOVIMIENTO.salida, fin => { if (fin) scheduleOnRN(terminarCierre); }));
  }
  function ir(destino: Href) {
    cerrar();
    router.navigate(destino);
  }
  const destinos = [
    { nombre: 'Portada', detalle: 'La edición que estás leyendo', ruta: '/feed', Icono: Diario },
    { nombre: 'Cuaderno de contexto', detalle: 'Preguntas, noticias y fuentes', ruta: '/', Icono: Asistente },
    ...(redaccion ? [{ nombre: 'Redacción', detalle: 'Tu espacio de trabajo editorial', ruta: '/redaccion', Icono: Diario }] : []),
    { nombre: 'Perfil', detalle: 'Tu ubicación y tus preferencias', ruta: '/perfil', Icono: Pantalla },
  ];
  return (
    <>
      <Pressable onPress={abrir} accessibilityRole="button" accessibilityLabel="Abrir menú editorial" accessibilityState={{ expanded: abierto }} aria-expanded={abierto}
        style={({ pressed }) => [estilos.disparador, barra && estilos.disparadorBarra, { opacity: pressed ? 0.65 : 1 }]}>
        <IconoMenu progreso={progreso} color={c.tinta} />
        <Text style={[estilos.textoBoton, { color: c.tinta }]}>Menú</Text>
      </Pressable>
      <Modal visible={montado} animationType="none" onRequestClose={cerrar} accessibilityLabel="Menú editorial">
        <SafeAreaProvider>
        <SafeAreaView style={[estilos.pantalla, { backgroundColor: c.papel }]}>
          <Animated.View testID="panel-menu-editorial" style={[estilos.pantalla, panel]}>
            <View style={[estilos.cabecera, { borderColor: c.borde }]}>
              <Logotipo />
              <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar menú editorial" style={({ pressed }) => [estilos.disparador, { opacity: pressed ? 0.65 : 1 }]}>
                <Text style={[estilos.textoBoton, { color: c.tinta }]}>Cerrar</Text><IconoMenu progreso={progreso} color={c.tinta} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={[estilos.contenido, { paddingHorizontal: ancha ? 40 : 24 }]}>
              <Text style={[ROTULO, { color: c.acento }]}>ÍNDICE DE LA PUBLICACIÓN</Text>
              {destinos.map((destino, i) => <Destino key={destino.ruta} {...destino} indice={i} activo={ruta === destino.ruta} ir={() => ir(destino.ruta as Href)} />)}
              <View style={[estilos.pie, { borderColor: c.borde }]}>
                <View style={{ gap: Espacio.s, flex: 1, minWidth: 160 }}>
                  <Text style={[estilos.firma, { color: c.tinta }]}>Leé a tu manera.</Text>
                  <Text style={[estilos.descripcion, { color: c.tintaSuave }]}>Elegí la apariencia de esta publicación.</Text>
                </View>
                <SelectorDeApariencia />
              </View>
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

function IconoMenu({ progreso, color }: { progreso: SharedValue<number>; color: string }) {
  const arriba = useAnimatedStyle(() => ({ transform: [{ translateY: progreso.value * 4 }, { rotate: `${progreso.value * 45}deg` }] }));
  const abajo = useAnimatedStyle(() => ({ transform: [{ translateY: progreso.value * -4 }, { rotate: `${progreso.value * -45}deg` }] }));
  return <View style={estilos.icono} aria-hidden>
    <Animated.View style={[estilos.trazo, { backgroundColor: color }, arriba]} />
    <Animated.View style={[estilos.trazo, { backgroundColor: color, marginTop: 6 }, abajo]} />
  </View>;
}

function Destino({ nombre, detalle, Icono, indice, activo, ir }: { nombre: string; detalle: string; ruta: string; Icono: typeof Diario; indice: number; activo: boolean; ir: () => void }) {
  const c = useColores();
  const { ancha } = useDisposicion();
  const progreso = useSharedValue(0);
  const flecha = useAnimatedStyle(() => ({ transform: [{ translateX: progreso.value * 8 }] }));
  return <Pressable onPress={ir} accessibilityRole="link" accessibilityLabel={`${nombre}${activo ? ', estás aquí' : ''}`}
    onHoverIn={() => { progreso.set(withTiming(1, MOVIMIENTO.breve)); }} onHoverOut={() => { progreso.set(withTiming(0, MOVIMIENTO.breve)); }}
    onFocus={() => { progreso.set(withTiming(1, MOVIMIENTO.breve)); }} onBlur={() => { progreso.set(withTiming(0, MOVIMIENTO.breve)); }}
    style={({ pressed }) => [estilos.destino, { borderColor: c.bordeFuerte, opacity: pressed ? 0.65 : 1 }]}>
    <Text style={[estilos.numero, { color: activo ? c.acento : c.tintaTenue }]} aria-hidden>{String(indice + 1).padStart(2, '0')}</Text>
    <View style={estilos.destinoTexto}>
      <Text style={[estilos.nombre, { color: c.tinta, fontSize: ancha ? 48 : 31, lineHeight: ancha ? 56 : 38 }]}>{nombre}</Text>
      <View style={estilos.detalle}><Icono color={c.tintaSuave} tamano={14} /><Text style={[estilos.descripcion, { color: c.tintaSuave }]}>{activo ? 'Estás aquí' : detalle}</Text></View>
    </View>
    <Animated.View style={flecha} aria-hidden><Derecha color={activo ? c.acento : c.tinta} tamano={ancha ? 38 : 26} /></Animated.View>
  </Pressable>;
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  disparador: { minHeight: 48, minWidth: 80, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Espacio.s, paddingHorizontal: Espacio.m },
  disparadorBarra: { flex: 1, minWidth: 0 },
  textoBoton: { fontFamily: Tipos.textoMedio, fontSize: 13 },
  icono: { width: 24, height: 20, justifyContent: 'center' },
  trazo: { height: 2, width: 24 },
  cabecera: { width: '100%', maxWidth: ANCHOS.portada, alignSelf: 'center', padding: Espacio.l, paddingHorizontal: Espacio.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  contenido: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingTop: 32, paddingBottom: 48, gap: Espacio.s },
  destino: { flexDirection: 'row', alignItems: 'center', gap: Espacio.l, paddingVertical: Espacio.xl, paddingRight: Espacio.s, borderBottomWidth: 1, minHeight: 96 },
  numero: { fontFamily: Tipos.numeros, fontSize: 12, alignSelf: 'flex-start', marginTop: 10 },
  destinoTexto: { flex: 1, gap: Espacio.s },
  nombre: { fontFamily: Tipos.lectura, letterSpacing: -0.6 },
  detalle: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s },
  descripcion: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 21, flexShrink: 1 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Espacio.xl, marginTop: Espacio.xl, paddingTop: Espacio.xl, borderTopWidth: 1 },
  firma: { fontFamily: Tipos.lectura, fontSize: 28, lineHeight: 34 },
});
