// ===========================================================================
// La redacción, dentro de la app
//
// La pestaña aparece solo si el rol de la cuenta tiene algún permiso de la
// redacción, y adentro cada sección solo si tiene la suya. Eso decide qué se
// MUESTRA: lo que cada uno PUEDE hacer lo vuelve a comprobar el backend en
// cada petición, y las políticas de fila en la base.
// ===========================================================================

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AreaDePestana } from '@/componentes/area-de-pestana';

import { BotonGoogle } from '@/componentes/boton-google';
import { Cuentas } from '@/componentes/redaccion/cuentas';
import { Gasto } from '@/componentes/redaccion/gasto';
import { Moderacion } from '@/componentes/redaccion/moderacion';
import { Publicar } from '@/componentes/redaccion/publicar';
import { ANCHOS, Espacio, Radio, Tipos, useColores, type Paleta } from '@/constants/tema';
import { usePermisos } from '@/lib/permisos';
import { useSesion } from '@/lib/sesion';

type Parte = 'publicar' | 'moderar' | 'cuentas' | 'gasto';

const NOMBRE_DE_ROL: Record<string, string> = {
  publicador: 'publicador',
  moderador: 'moderador',
  administrador: 'administrador',
};

export default function Redaccion() {
  const c = useColores();
  const e = crearEstilos(c);
  const { sesion } = useSesion();
  const permisos = usePermisos();

  const partes = (
    [
      ['publicar', 'Publicar', permisos.publicar],
      ['moderar', 'Moderación', permisos.moderar],
      ['cuentas', 'Cuentas', permisos.administrar],
      ['gasto', 'Gasto', permisos.administrar],
    ] as const
  ).filter(([, , puede]) => puede);

  const [elegida, setElegida] = useState<Parte | null>(null);
  const parte = partes.find(([clave]) => clave === elegida)?.[0] ?? partes[0]?.[0] ?? null;

  return (
    <AreaDePestana style={e.pantalla}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">
          <Text style={e.titulo} accessibilityRole="header">
            Redacción
          </Text>

          {sesion === null ? (
            <View style={{ gap: Espacio.m }}>
              <Text style={e.texto}>Entrá con tu cuenta para publicar, moderar o administrar.</Text>
              <BotonGoogle />
            </View>
          ) : !permisos.listos ? (
            <ActivityIndicator color={c.acento} style={{ marginTop: Espacio.xl }} />
          ) : parte === null ? (
            <Text style={e.texto}>
              Tu cuenta es lectora. Para publicar o moderar, un administrador te da el permiso; nadie se lo
              asigna solo.
            </Text>
          ) : (
            <>
              <Text style={e.texto}>
                Entraste como {NOMBRE_DE_ROL[permisos.rol ?? ''] ?? permisos.rol}. Lo que publicás pasa por el
                canal de validación antes de llegar a la portada.
              </Text>

              {partes.length > 1 ? (
                <View style={e.pestanas} accessibilityRole="tablist">
                  {partes.map(([clave, nombre]) => {
                    const activa = clave === parte;
                    return (
                      <Pressable
                        key={clave}
                        onPress={() => setElegida(clave)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: activa }}
                        style={[e.pestana, { borderBottomColor: activa ? c.marca : 'transparent' }]}>
                        <Text style={[e.pestanaTexto, { color: activa ? c.tinta : c.tintaSuave, fontFamily: activa ? Tipos.textoFuerte : Tipos.textoMedio }]}>
                          {nombre}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {parte === 'publicar' ? (
                <Publicar />
              ) : parte === 'moderar' ? (
                <Moderacion />
              ) : parte === 'gasto' ? (
                <Gasto />
              ) : (
                <Cuentas />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AreaDePestana>
  );
}

function crearEstilos(c: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.papel },
    contenido: { padding: Espacio.xl, paddingBottom: 64, gap: Espacio.xl, width: '100%', maxWidth: ANCHOS.conversacion, alignSelf: 'center' },
    titulo: { fontFamily: Tipos.titular, fontSize: 32, lineHeight: 40, letterSpacing: -0.8, color: c.tinta, paddingVertical: Espacio.m, paddingBottom: Espacio.xl, borderBottomWidth: 1, borderBottomColor: c.borde },
    texto: { fontFamily: Tipos.texto, fontSize: 14, lineHeight: 24, color: c.tintaSuave },
    pestanas: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: c.borde, gap: Espacio.s },
    pestana: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Espacio.l, paddingVertical: Espacio.s, borderBottomWidth: 3, marginBottom: -1, borderRadius: Radio.chico },
    pestanaTexto: { fontSize: 14, lineHeight: 22 },
  });
}
