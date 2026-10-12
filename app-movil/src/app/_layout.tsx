import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';

import { ANCHO_DE_COLUMNA, FUENTES, Tipos, useColores } from '@/constants/tema';
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
  const ancha = useWindowDimensions().width > ANCHO_DE_COLUMNA;

  useEffect(() => {
    if (cargadas || error) SplashScreen.hideAsync();
  }, [cargadas, error]);

  // Si las letras fallan, la app sigue con las del sistema: mejor eso que nada.
  if (!cargadas && !error) return null;

  return (
    <ProveedorDeSesion>
      <ProveedorDePreferencias>
        <ThemeProvider value={esquema === 'dark' ? DarkTheme : DefaultTheme}>
          {/* En una pantalla ancha (la web, una tableta) la app no se estira de
              lado a lado: queda en una columna, como una página de diario. */}
          <View style={[estilos.fondo, { backgroundColor: ancha ? c.papelHundido : c.papel }]}>
            <View
              style={[
                estilos.columna,
                { backgroundColor: c.papel },
                ancha ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.borde } : null,
              ]}>
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
            </View>
          </View>
        </ThemeProvider>
      </ProveedorDePreferencias>
    </ProveedorDeSesion>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1 },
  columna: { flex: 1, width: '100%', maxWidth: ANCHO_DE_COLUMNA, alignSelf: 'center' },
});
