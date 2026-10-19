import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Espacio, ROTULO, Tipos, useColores, useDisposicion } from '@/constants/tema';
import type { NoticiaDelFeed } from '@/lib/noticias';
import { SECCIONES } from '@/lib/secciones';

const APARICION = FadeIn.duration(180).reduceMotion(ReduceMotion.System);

/** Índice de esta portada, no un cambio de intereses ni del ranking. */
export function IndiceDeSecciones({ noticias, elegida, cambiar }: {
  noticias: NoticiaDelFeed[];
  elegida: string | null;
  cambiar: (seccion: string | null) => void;
}) {
  const c = useColores();
  const { ancha } = useDisposicion();
  const conteos = new Map<string, number>();
  for (const noticia of noticias) conteos.set(noticia.seccion, (conteos.get(noticia.seccion) ?? 0) + 1);
  const opciones = [
    { clave: null, nombre: 'Toda la portada', cantidad: noticias.length },
    ...SECCIONES.filter(s => conteos.has(s.clave) || s.clave === elegida)
      .map(s => ({ ...s, cantidad: conteos.get(s.clave) ?? 0 })),
  ];

  return (
    <View style={estilos.indice}>
      {ancha ? <Text style={[ROTULO, { color: c.tintaSuave }]}>Índice de lectura</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.desplazamiento} contentContainerStyle={estilos.margenDeFoco}>
        <Animated.View entering={APARICION} accessibilityRole="radiogroup" accessibilityLabel="Sección de la portada" style={estilos.opciones}>
          {opciones.map(o => {
            const activa = elegida === o.clave;
            return (
              <Pressable
                key={o.clave ?? 'todas'}
                onPress={() => cambiar(o.clave)}
                accessibilityRole="radio"
                accessibilityState={{ checked: activa }}
                aria-checked={activa}
                accessibilityLabel={`${o.nombre}, ${o.cantidad} ${o.cantidad === 1 ? 'noticia' : 'noticias'}`}
                style={({ pressed }) => [estilos.opcion, { opacity: pressed ? 0.7 : 1 }]}>
                <View style={[estilos.pildora, { backgroundColor: activa ? c.marca : c.papelHundido, borderColor: activa ? c.marca : c.borde }]}>
                  <Text style={[estilos.nombre, { color: activa ? c.sobreMarca : c.tinta }]}>{o.nombre}</Text>
                  <Text style={[estilos.cantidad, { color: activa ? c.sobreMarca : c.tintaTenue }]}>{String(o.cantidad).padStart(2, '0')}</Text>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>
      {elegida !== null ? (
        <Text accessibilityLiveRegion="polite" style={[estilos.nota, { color: c.tintaSuave }]}>
          Estás viendo una sección. Volvé a Toda la portada para recuperar la cobertura completa.
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  indice: { paddingTop: Espacio.s, gap: Espacio.s },
  desplazamiento: { flexGrow: 0, margin: -6 },
  margenDeFoco: { padding: 6 },
  opciones: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  opcion: { minHeight: 48, justifyContent: 'center', paddingVertical: 4, borderRadius: 24 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 24 },
  nombre: { fontFamily: Tipos.textoMedio, fontSize: 12, lineHeight: 18 },
  cantidad: { fontFamily: Tipos.numeros, fontSize: 11, lineHeight: 18 },
  nota: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 19 },
});
