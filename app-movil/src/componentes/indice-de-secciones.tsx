import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Espacio, ROTULO, Tipos, useColores, useDisposicion } from '@/constants/tema';
import type { NoticiaDelFeed } from '@/lib/noticias';
import { SECCIONES } from '@/lib/secciones';
import { Abajo, Diario } from './iconos';

/** Índice de esta portada, no un cambio de intereses ni del ranking. */
export function IndiceDeSecciones({ noticias, elegida, cambiar }: {
  noticias: NoticiaDelFeed[];
  elegida: string | null;
  cambiar: (seccion: string | null) => void;
}) {
  const c = useColores();
  const { ancha } = useDisposicion();
  const [abierto, setAbierto] = useState(false);
  const conteos = new Map<string, number>();
  for (const noticia of noticias) conteos.set(noticia.seccion, (conteos.get(noticia.seccion) ?? 0) + 1);
  const opciones = [
    { clave: null, nombre: 'Toda la portada', cantidad: noticias.length },
    ...SECCIONES.filter(s => conteos.has(s.clave) || s.clave === elegida)
      .map(s => ({ ...s, cantidad: conteos.get(s.clave) ?? 0 })),
  ];

  return (
    <View style={[estilos.indice, { borderColor: c.borde }]}>
      {ancha ? <View style={estilos.rotulo}>
        <Diario color={c.tintaSuave} tamano={15} />
        <Text style={[ROTULO, { color: c.tintaSuave }]}>Índice de lectura</Text>
      </View> : (
        <Pressable
          onPress={() => setAbierto(valor => !valor)}
          accessibilityRole="button"
          accessibilityLabel="Explorar secciones"
          accessibilityState={{ expanded: abierto }}
          aria-expanded={abierto}
          style={({ pressed }) => [estilos.control, { opacity: pressed ? 0.7 : 1 }]}>
          <Diario color={c.tintaSuave} tamano={15} />
          <Text style={[estilos.nombre, { color: c.tinta, flex: 1 }]}>Explorar secciones</Text>
          {elegida ? <Text style={[estilos.nombre, { color: c.acento }]}>{SECCIONES.find(s => s.clave === elegida)?.nombre}</Text> : null}
          <View aria-hidden style={{ transform: [{ rotate: abierto ? '180deg' : '0deg' }] }}><Abajo color={c.tintaSuave} /></View>
        </Pressable>
      )}
      {ancha || abierto ? <View accessibilityRole="radiogroup" accessibilityLabel="Sección de la portada" style={estilos.opciones}>
        {opciones.map(o => {
          const activa = elegida === o.clave;
          return (
            <Pressable
              key={o.clave ?? 'todas'}
              onPress={() => { cambiar(o.clave); setAbierto(false); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: activa }}
              aria-checked={activa}
              accessibilityLabel={`${o.nombre}, ${o.cantidad} ${o.cantidad === 1 ? 'noticia' : 'noticias'}`}
              style={({ pressed }) => [estilos.opcion, { backgroundColor: activa ? c.primario : 'transparent', borderColor: activa ? c.primario : c.borde, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[estilos.nombre, { color: activa ? c.sobrePrimario : c.tinta }]}>{o.nombre}</Text>
              <Text style={[estilos.cantidad, { color: activa ? c.sobrePrimario : c.tintaTenue }]}>{String(o.cantidad).padStart(2, '0')}</Text>
            </Pressable>
          );
        })}
      </View> : null}
      {elegida !== null ? (
        <Text accessibilityLiveRegion="polite" style={[estilos.nota, { color: c.tintaSuave }]}>
          Estás viendo una sección. Volvé a Toda la portada para recuperar la cobertura completa.
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  indice: { paddingVertical: Espacio.l, gap: Espacio.m, borderBottomWidth: 1 },
  control: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: Espacio.s },
  rotulo: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Espacio.s },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: Espacio.l, minHeight: 44, paddingHorizontal: 14, paddingVertical: Espacio.s, borderWidth: 1 },
  nombre: { fontFamily: Tipos.textoMedio, fontSize: 13, lineHeight: 20 },
  cantidad: { fontFamily: Tipos.numeros, fontSize: 11 },
  nota: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 20 },
});
