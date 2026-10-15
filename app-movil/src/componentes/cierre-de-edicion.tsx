import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Espacio, ROTULO, Tipos, useColores } from '@/constants/tema';
import { Diario, Reloj } from './iconos';

export function CierreDeEdicion({ cantidad, actualizadoEn, actualizar, cargando, filtrada, error }: {
  cantidad: number; actualizadoEn: number | null; actualizar: () => void; cargando: boolean; filtrada: boolean; error: string | null;
}) {
  const c = useColores();
  const fecha = actualizadoEn === null ? null : new Date(actualizadoEn).toLocaleString('es-GT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[estilos.cierre, { borderColor: c.borde, backgroundColor: c.papelHundido }]}>
      <View style={[estilos.marca, { borderColor: c.verificado }]} aria-hidden><Diario color={c.verificado} tamano={26} /></View>
      <Text style={[ROTULO, { color: c.tintaSuave }]}>CIERRE DE EDICIÓN</Text>
      <Text style={[estilos.titulo, { color: c.tinta }]}>Hasta aquí, por ahora.</Text>
      <Text style={[estilos.texto, { color: c.tintaSuave }]}>{cantidad} {cantidad === 1 ? 'noticia disponible' : 'noticias disponibles'} {filtrada ? 'en esta sección.' : 'en esta portada. Un buen momento para hacer una pausa.'}</Text>
      {fecha ? <View style={estilos.fila}><Reloj color={c.tintaTenue} /><Text style={[estilos.fecha, { color: c.tintaTenue }]}>Consultada el {fecha}</Text></View> : null}
      <Pressable onPress={actualizar} disabled={cargando} accessibilityRole="button" accessibilityLabel="Actualizar portada"
        style={({ pressed }) => [estilos.accion, { borderColor: c.bordeFuerte, opacity: cargando || pressed ? 0.6 : 1 }]}>
        {cargando ? <ActivityIndicator size="small" color={c.acento} /> : <Diario color={c.acento} tamano={16} />}
        <Text style={[estilos.accionTexto, { color: c.acento }]}>{cargando ? 'Consultando…' : 'Actualizar portada'}</Text>
      </Pressable>
      {error ? <Text accessibilityLiveRegion="polite" style={[estilos.texto, { color: c.peligro }]}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cierre: { padding: Espacio.xl, paddingVertical: 40, alignItems: 'center', gap: Espacio.l, borderTopWidth: 1 },
  marca: { width: 54, height: 54, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: Espacio.s },
  titulo: { fontFamily: Tipos.lectura, fontSize: 36, lineHeight: 42, textAlign: 'center' },
  texto: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 23, maxWidth: 420, textAlign: 'center' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: Espacio.s },
  fecha: { fontFamily: Tipos.texto, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: Espacio.s, minHeight: 48, paddingHorizontal: Espacio.l, borderWidth: 1, marginTop: Espacio.s },
  accionTexto: { fontFamily: Tipos.textoMedio, fontSize: 13 },
});
