import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Tipos, useColores } from '@/constants/tema';
import { useSesion } from '@/lib/sesion';

export function BotonGoogle() {
  const c = useColores();
  const { entrarConGoogle } = useSesion();
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setError(null);
    setEntrando(true);
    try {
      await entrarConGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={entrar}
        disabled={entrando}
        accessibilityRole="button"
        style={({ pressed }) => [
          estilos.boton,
          { opacity: pressed || entrando ? 0.7 : 1 },
        ]}>
        {entrando ? (
          <ActivityIndicator color="#1F1F1F" />
        ) : (
          <>
            <Image source={require('../../assets/images/google-g.png')} style={estilos.g} contentFit="contain" accessible={false} />
            <Text style={estilos.texto}>Entrar con Google</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={[estilos.error, { color: c.peligro }]}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: { minHeight: 48, borderWidth: 1, borderColor: '#747775', backgroundColor: '#FFFFFF', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Platform.OS === 'ios' ? 12 : 10, paddingHorizontal: Platform.OS === 'ios' ? 16 : 12, paddingVertical: 12 },
  g: { width: 20, height: 20.4, flexShrink: 0 },
  texto: { color: '#1F1F1F', fontSize: 14, lineHeight: 20, fontFamily: Tipos.google, flexShrink: 1 },
  error: { fontSize: 13, lineHeight: 21, textAlign: 'center', fontFamily: Tipos.texto },
});
