// El cambio de ubicación tiene que ser rápido: en la demostración varios
// compañeros eligen ubicaciones distintas y comparan. Un modal con la lista
// cerrada, agrupada en Guatemala y otros países.

import { Modal, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Espacio, Tipos, useColores, type Paleta } from '@/constants/tema';
import { usePreferencias } from '@/lib/preferencias';

export function SelectorDeUbicacion({ visible, cerrar }: { visible: boolean; cerrar: () => void }) {
  const c = useColores();
  const e = crearEstilos(c);
  const { ubicaciones, ubicacion, cambiarUbicacion } = usePreferencias();

  const secciones = [
    { titulo: 'GUATEMALA', data: ubicaciones.filter((u) => u.tipo === 'departamento') },
    { titulo: 'OTROS PAÍSES', data: ubicaciones.filter((u) => u.tipo === 'pais') },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <SafeAreaView style={e.pantalla}>
        <View style={e.cabecera}>
          <View style={{ flex: 1 }}>
            <Text style={e.titulo}>Tu ubicación</Text>
            <Text style={e.nota}>Simulada: no se usa el GPS. Cambia lo que ves en la portada y en el chat.</Text>
          </View>
          <Pressable onPress={cerrar} accessibilityRole="button" hitSlop={12}>
            <Text style={e.listo}>Listo</Text>
          </Pressable>
        </View>

        <SectionList
          sections={secciones}
          keyExtractor={(u) => u.id}
          renderSectionHeader={({ section }) => <Text style={e.grupo}>{section.titulo}</Text>}
          renderItem={({ item }) => {
            const elegida = item.id === ubicacion.id;
            return (
              <Pressable
                onPress={async () => {
                  await cambiarUbicacion(item.id);
                  cerrar();
                }}
                style={[e.opcion, elegida ? e.opcionElegida : null]}
                accessibilityRole="button"
                accessibilityState={{ selected: elegida }}>
                <Text style={[e.opcionTexto, elegida ? { color: c.acento, fontWeight: '700' } : null]}>
                  {item.nombre}
                </Text>
                {elegida ? <Text style={e.marca}>✓</Text> : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Espacio.m,
      padding: Espacio.l,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borde,
    },
    titulo: { fontFamily: Tipos.titulares, fontSize: 24, fontWeight: '700', color: c.tinta },
    nota: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 18, color: c.tintaSuave, marginTop: 4 },
    listo: { fontFamily: Tipos.texto, fontSize: 16, fontWeight: '700', color: c.acento, paddingTop: 4 },
    grupo: {
      fontFamily: Tipos.texto,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: c.tintaSuave,
      backgroundColor: c.papel,
      paddingHorizontal: Espacio.l,
      paddingTop: Espacio.l,
      paddingBottom: Espacio.s,
    },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: Espacio.l,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borde,
    },
    opcionElegida: { backgroundColor: c.papelHundido },
    opcionTexto: { flex: 1, fontFamily: Tipos.texto, fontSize: 16, color: c.tinta },
    marca: { fontSize: 18, color: c.acento, fontWeight: '700' },
  });
}
