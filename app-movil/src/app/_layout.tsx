import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { FUENTES, Tipos, useColores } from '@/constants/tema';
import { ProveedorDePreferencias } from '@/lib/preferencias';
import { ProveedorDeSesion } from '@/lib/sesion';

// La pantalla de inicio se queda hasta que llegan las letras: sin ellas, la app
// aparecería un instante con la fuente del sistema y después saltaría.
SplashScreen.preventAutoHideAsync();

// Una pila encima de las pestañas: la lectura de una noticia se apila sobre la
// pestaña desde la que se abrió, con su botón de volver, como en cualquier app.
export default function Raiz() {
  const esquema = useColorScheme();
  const c = useColores();
  const [cargadas, error] = useFonts(FUENTES);

  useEffect(() => {
    if (cargadas || error) SplashScreen.hideAsync();
  }, [cargadas, error]);

  // Si las letras fallan, la app sigue con las del sistema: mejor eso que nada.
  if (!cargadas && !error) return null;

  return (
    <ProveedorDeSesion>
      <ProveedorDePreferencias>
        <ThemeProvider value={esquema === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.papel } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="noticia/[id]"
              options={{
                headerShown: true,
                title: '',
                headerBackTitle: 'Volver',
                headerBackTitleStyle: { fontFamily: Tipos.textoMedio },
                headerTintColor: c.tinta,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: c.papel },
              }}
            />
          </Stack>
        </ThemeProvider>
      </ProveedorDePreferencias>
    </ProveedorDeSesion>
  );
}
