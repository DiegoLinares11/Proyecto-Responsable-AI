// El cambio de ubicación tiene que ser rápido: en la demostración varios
// compañeros eligen ubicaciones distintas y comparan. Un modal con la lista
// cerrada, agrupada en Guatemala y otros países.
//
// El GPS es opcional y solo SUGIERE: busca la cabecera departamental más
// cercana dentro del teléfono (lib/cercania.ts) y la deja elegida, pero el
// usuario la puede cambiar. La personalización depende de la ubicación elegida,
// no del GPS, como pide el enunciado.

import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Espacio, Tipos, useColores, type Paleta } from '@/constants/tema';
import { departamentoMasCercano } from '@/lib/cercania';
import { usePreferencias } from '@/lib/preferencias';

export function SelectorDeUbicacion({ visible, cerrar }: { visible: boolean; cerrar: () => void }) {
  const c = useColores();
  const e = crearEstilos(c);
  const { ubicaciones, ubicacion, cambiarUbicacion } = usePreferencias();
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function usarUbicacionReal() {
    setAviso(null);
    setBuscando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAviso('Sin permiso de ubicación. Elegí tu zona de la lista.');
        return;
      }
      // Precisión baja a propósito: para elegir un departamento no hace falta más.
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const id = departamentoMasCercano(posicion.coords.latitude, posicion.coords.longitude);
      if (id === null) {
        setAviso('Tu ubicación real no está en Guatemala. Elegí una de la lista.');
        return;
      }
      await cambiarUbicacion(id);
      const nombre = ubicaciones.find((u) => u.id === id)?.nombre ?? id;
      setAviso(`Elegimos ${nombre}, la cabecera más cercana. Podés cambiarla cuando quieras.`);
    } catch {
      setAviso('No se pudo leer la ubicación. Elegí tu zona de la lista.');
    } finally {
      setBuscando(false);
    }
  }

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
            <Text style={e.nota}>Simulada: la elegís vos. Cambia lo que ves en la portada y en el chat.</Text>
          </View>
          <Pressable onPress={cerrar} accessibilityRole="button" hitSlop={12}>
            <Text style={e.listo}>Listo</Text>
          </Pressable>
        </View>

        <View style={e.gps}>
          <Pressable
            onPress={usarUbicacionReal}
            disabled={buscando}
            style={e.botonGps}
            accessibilityRole="button">
            {buscando ? (
              <ActivityIndicator color={c.acento} />
            ) : (
              <Text style={e.botonGpsTexto}>📍 Usar mi ubicación real (aproximada)</Text>
            )}
          </Pressable>
          <Text style={e.nota}>
            Se calcula en tu teléfono contra las cabeceras departamentales: las coordenadas no se
            mandan a ningún servidor ni se guardan.
          </Text>
          {aviso ? <Text style={e.aviso}>{aviso}</Text> : null}
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
    gps: {
      padding: Espacio.l,
      gap: Espacio.s,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borde,
    },
    botonGps: {
      minHeight: 46,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.acento,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Espacio.l,
    },
    botonGpsTexto: { fontFamily: Tipos.texto, fontSize: 15, fontWeight: '600', color: c.acento },
    aviso: { fontFamily: Tipos.texto, fontSize: 13, lineHeight: 18, color: c.tinta },
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
