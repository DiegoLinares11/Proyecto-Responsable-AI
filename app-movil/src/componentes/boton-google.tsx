import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
          { borderColor: c.borde, backgroundColor: c.papel, opacity: pressed || entrando ? 0.7 : 1 },
        ]}>
        {entrando ? (
          <ActivityIndicator color={c.tinta} />
        ) : (
          <>
            <Text style={estilos.g}>G</Text>
            <Text style={[estilos.texto, { color: c.tinta }]}>Entrar con Google</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={[estilos.error, { color: c.peligro }]}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  g: { fontSize: 18, fontWeight: '800', color: '#4285F4', fontFamily: Tipos.texto },
  texto: { fontSize: 15, fontWeight: '600', fontFamily: Tipos.texto },
  error: { fontSize: 13, textAlign: 'center', fontFamily: Tipos.texto },
});
