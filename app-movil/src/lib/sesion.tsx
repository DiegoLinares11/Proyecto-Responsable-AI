// ===========================================================================
// La sesión: entrar con Google por Supabase
//
// El login se abre en el navegador del teléfono. Google le contesta a SUPABASE
// —a su dirección https de siempre—, y Supabase devuelve la sesión a la app
// por un enlace profundo. Google nunca ve la dirección `exp://` de Expo Go, que
// es lo que hace que este camino funcione sin una cuenta de desarrollador de
// Apple: con Firebase, el login de Google dentro de Expo Go no funciona.
//
// Requisito en el panel de Supabase (Authentication → URL Configuration):
// agregar `exp://**` y `noticiasverificadas://**` a las Redirect URLs, y
// habilitar el proveedor Google con sus credenciales.
// ===========================================================================

import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type ValorDeSesion = {
  sesion: Session | null;
  cargando: boolean;
  entrarConGoogle: () => Promise<void>;
  salir: () => Promise<void>;
};

const ContextoDeSesion = createContext<ValorDeSesion | null>(null);

/** Crea la sesión a partir de la URL con la que Supabase devolvió al usuario. */
async function crearSesionDesdeUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(params['error_description'] ?? errorCode);

  // Flujo PKCE: llega un código que se canjea por la sesión.
  if (params['code']) {
    const { error } = await supabase.auth.exchangeCodeForSession(params['code']);
    if (error) throw error;
    return;
  }

  // Flujo implícito: llegan los tokens directamente.
  const accessToken = params['access_token'];
  const refreshToken = params['refresh_token'];
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  }
}

export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const urlEntrante = Linking.useURL();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  // Si la app se abrió por el enlace de regreso del login —por ejemplo, porque
  // el sistema la había cerrado mientras el usuario estaba en el navegador—,
  // la sesión se crea igual.
  useEffect(() => {
    if (urlEntrante && /(access_token|code)=/.test(urlEntrante)) {
      crearSesionDesdeUrl(urlEntrante).catch(() => {});
    }
  }, [urlEntrante]);

  async function entrarConGoogle() {
    const redirectTo = makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;

    const resultado = await WebBrowser.openAuthSessionAsync(data.url ?? '', redirectTo);
    if (resultado.type === 'success') {
      await crearSesionDesdeUrl(resultado.url);
    }
  }

  async function salir() {
    await supabase.auth.signOut();
  }

  return (
    <ContextoDeSesion.Provider value={{ sesion, cargando, entrarConGoogle, salir }}>
      {children}
    </ContextoDeSesion.Provider>
  );
}

export function useSesion(): ValorDeSesion {
  const valor = useContext(ContextoDeSesion);
  if (valor === null) throw new Error('useSesion se usa dentro de ProveedorDeSesion');
  return valor;
}
