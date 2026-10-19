import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Head from 'expo-router/head';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { FUENTES, Tipos, useColores } from '@/constants/tema';
import { MarcaNexo } from '@/componentes/marca';
import { ProveedorDePermisos } from '@/lib/permisos';
import { ProveedorDePreferencias } from '@/lib/preferencias';
import { ProveedorDeSesion } from '@/lib/sesion';
import { ProveedorDeApariencia, useApariencia } from '@/lib/apariencia';

// La pantalla de inicio se queda hasta que llegan las letras: sin ellas, la app
// aparecería un instante con la fuente del sistema y después saltaría.
SplashScreen.preventAutoHideAsync();

// Una pila encima de las pestañas: la lectura de una noticia se apila sobre la
// pestaña desde la que se abrió, con su botón de volver, como en cualquier app.
export default function Raiz() {
  return <ProveedorDeApariencia><Contenido /></ProveedorDeApariencia>;
}

function Contenido() {
  const { esquema } = useApariencia();
  const c = useColores();
  const [cargadas, error] = useFonts(FUENTES);

  useEffect(() => {
    if (cargadas || error) SplashScreen.hideAsync();
  }, [cargadas, error]);

  // Si las letras fallan, la app sigue con las del sistema: mejor eso que nada.
  if (!cargadas && !error) return null;

  return (
    <ProveedorDeSesion>
      <ProveedorDePermisos>
        <ProveedorDePreferencias>
          <ThemeProvider value={{
            ...(esquema === 'dark' ? DarkTheme : DefaultTheme),
            colors: {
              ...(esquema === 'dark' ? DarkTheme : DefaultTheme).colors,
              background: c.papel, card: c.papel, text: c.tinta, primary: c.acento, border: c.borde,
            },
          }}>
            {Platform.OS === 'web' ? <Head><title>NEXO · Noticias</title></Head> : null}
            <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ title: 'NEXO', headerShown: false, contentStyle: { backgroundColor: c.papel } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="noticia/[id]"
                options={{
                  headerShown: true,
                  title: 'NEXO',
                  headerTitle: () => <MarcaNexo tamano={22} etiqueta="NEXO" />,
                  headerTitleAlign: 'center',
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
      </ProveedorDePermisos>
    </ProveedorDeSesion>
  );
}
