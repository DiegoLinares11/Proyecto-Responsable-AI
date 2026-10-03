import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useColores } from '@/constants/tema';
import { ProveedorDeSesion } from '@/lib/sesion';

// Una pila encima de las pestañas: la lectura de una noticia se apila sobre la
// pestaña desde la que se abrió, con su botón de volver, como en cualquier app.
export default function Raiz() {
  const esquema = useColorScheme();
  const c = useColores();

  return (
    <ProveedorDeSesion>
      <ThemeProvider value={esquema === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.papel } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="noticia/[id]"
            options={{
              headerShown: true,
              title: '',
              headerBackTitle: 'Volver',
              headerTintColor: c.acento,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: c.papel },
            }}
          />
        </Stack>
      </ThemeProvider>
    </ProveedorDeSesion>
  );
}
