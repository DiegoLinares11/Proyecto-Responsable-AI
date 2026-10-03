// ===========================================================================
// El chat, contra el servidor del portal
//
// El modelo NO se llama desde el teléfono. La llave de la API y las cinco capas
// de defensa viven en el servidor (src/app/api/chat/route.ts): una llave dentro
// de la app la puede sacar cualquiera que la descargue, y el presupuesto es de
// USD 20 en total.
// ===========================================================================

import Constants from 'expo-constants';

import { supabase } from './supabase';

export type RespuestaDelChat = {
  respuesta: string;
  bloqueado: boolean;
  capaQueCorto: string | null;
  categoria: string | null;
  noticiasCitadas: string[];
  confianza: 'alta' | 'media' | 'baja' | null;
};

/**
 * Dónde está el servidor.
 *
 * Con `EXPO_PUBLIC_API_URL` manda esa (el portal desplegado). Si no, en
 * desarrollo se usa la misma computadora desde la que Expo Go cargó la app,
 * en el puerto 3000 de Next.js: así un teléfono en la misma red llega sin
 * configurar nada.
 */
export function urlDelServidor(): string {
  const configurada = process.env.EXPO_PUBLIC_API_URL;
  if (configurada) return configurada.replace(/\/$/, '');

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3000`;
}

/**
 * La ubicación viaja con cada pregunta: es la que el usuario ve en pantalla, y
 * el servidor la valida contra la lista cerrada antes de usarla.
 */
export async function preguntar(mensaje: string, idUbicacion: string): Promise<RespuestaDelChat> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Hay que entrar para usar el asistente.');

  let respuesta: Response;
  try {
    respuesta = await fetch(`${urlDelServidor()}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ mensaje, ubicacion: idUbicacion }),
    });
  } catch {
    throw new Error(
      `No se pudo llegar al servidor en ${urlDelServidor()}. ` +
        'En desarrollo, el portal tiene que estar corriendo (npm run dev) en la misma red.',
    );
  }

  const cuerpo = (await respuesta.json().catch(() => ({}))) as Partial<RespuestaDelChat> & {
    error?: string;
  };
  if (!respuesta.ok) throw new Error(cuerpo.error ?? `El servidor respondió ${respuesta.status}.`);

  return cuerpo as RespuestaDelChat;
}
