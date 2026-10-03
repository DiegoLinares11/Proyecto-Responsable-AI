// ===========================================================================
// El cliente de Supabase de la app
//
// Va con la llave PUBLICABLE, que por diseño viaja en el teléfono. Lo que la
// app puede leer o escribir lo deciden las políticas de fila de la base —las
// mismas de la web—, no este archivo. Esa es la razón de que la Fase 1 pusiera
// el control de accesos en el motor: ahora hay un segundo cliente, y no hubo
// que reescribir ninguna regla.
// ===========================================================================

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { almacen } from './almacen';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const llave = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !llave) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copiá app-movil/.env.example a app-movil/.env.local y completalo.',
  );
}

export const supabase = createClient(url, llave, {
  auth: {
    storage: almacen,
    autoRefreshToken: true,
    persistSession: true,
    // En el teléfono la sesión no llega en la URL de la página: llega por el
    // enlace profundo del login, y la crea `sesion.tsx`.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// En el teléfono el refresco automático del token solo debe correr con la app
// en primer plano; es lo que recomienda Supabase para React Native.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
