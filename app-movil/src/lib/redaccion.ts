// ===========================================================================
// La redacción, contra el backend
//
// Publicar, moderar y administrar no se hacen desde el teléfono contra la base:
// publicar corre el canal de validación con la llave de servicio, y cambiar un
// rol o auditar una decisión también la necesitan. Esas llaves no pueden vivir
// en la app. Todo va a /api/redaccion con el token de la sesión, y el backend
// vuelve a comprobar el permiso en cada petición (src/app/api/redaccion).
// ===========================================================================

import { urlDelServidor } from './chat';
import { supabase } from './supabase';

export type FotoLibre = { url: string; urlFuente: string; autor: string; licencia: string; credito: string; alterno: string };

export type ResultadoDePublicacion = { error: string } | { ok: string; idNoticia: string; estado: string; puntaje: number };
export type Resultado = { error: string } | { ok: string };

export type NoticiaEnRevision = {
  id: string;
  titulo: string;
  resumen: string;
  urlOriginal: string | null;
  estado: string;
  puntajeVeracidad: number | null;
  creadoEn: string;
  rafagaSospechosa: boolean;
  rafagaMotivo: string | null;
};

export type AlertaDeContenido = {
  idNoticia: string;
  titulo: string;
  autor: string | null;
  fuente: string | null;
  veces: number;
  ultimaVez: string;
  evidencias: { comprobacion: string; evidencia: string; veces: number }[];
};

export type Cuenta = { id: string; nombre: string; correo: string; rol: string; creadaEn: string };
export type CambioDeRol = { cuando: string; correo: string; de: string; a: string; motivo: string; via: string };

async function pedir<T>(metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<T | { error: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: 'Hay que entrar.' };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${urlDelServidor()}/api/redaccion${ruta}`, {
      method: metodo,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    return { error: `No se pudo llegar al servidor en ${urlDelServidor()}.` };
  }

  const json = (await respuesta.json().catch(() => null)) as (T & { error?: string }) | null;
  if (json === null) return { error: `El servidor respondió ${respuesta.status} sin datos.` };
  return json;
}

export const buscarFotos = (consulta: string) =>
  pedir<{ fotos: FotoLibre[] }>('GET', `/fotos?q=${encodeURIComponent(consulta)}`);

/** Los campos se llaman igual que los del formulario del portal. */
export const publicar = (campos: Record<string, string>) => pedir<ResultadoDePublicacion>('POST', '/publicar', campos);

export const leerModeracion = () => pedir<{ cola: NoticiaEnRevision[]; alertas: AlertaDeContenido[] }>('GET', '/moderacion');

export const decidir = (sobre: 'noticia' | 'alerta', id: string, decision: string, motivo: string) =>
  pedir<Resultado>('POST', '/moderacion', { sobre, id, decision, motivo });

export const leerCuentas = (conDemostracion: boolean) =>
  pedir<{ cuentas: Cuenta[]; cambios: CambioDeRol[]; yo: string }>('GET', `/cuentas${conDemostracion ? '?demo=1' : ''}`);

export const cambiarRol = (idUsuario: string, rol: string, motivo: string) =>
  pedir<Resultado>('POST', '/cuentas', { id_usuario: idUsuario, rol, motivo });
