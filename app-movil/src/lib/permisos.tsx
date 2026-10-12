// ===========================================================================
// Qué puede hacer la cuenta que entró
//
// Se lee directo de Supabase con la sesión: el rol de la cuenta y las claves de
// permiso de ese rol. Esto decide QUÉ MOSTRAR —por ejemplo, si aparece la
// pestaña «Redacción»—, no qué se puede hacer: eso lo deciden las políticas de
// fila y el backend, que vuelve a comprobar el permiso en cada petición.
// ===========================================================================

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useSesion } from './sesion';
import { supabase } from './supabase';

export type Permisos = {
  rol: string | null;
  publicar: boolean;
  moderar: boolean;
  administrar: boolean;
  /** Si tiene algo de la redacción: es lo que hace aparecer la pestaña. */
  redaccion: boolean;
};

const SIN_PERMISOS: Permisos = { rol: null, publicar: false, moderar: false, administrar: false, redaccion: false };

type ValorDePermisos = Permisos & {
  /** Falso mientras se leen los de la cuenta que entró: evita mostrarle un
   *  instante «tu cuenta es lectora» a quien no lo es. */
  listos: boolean;
  recargar: () => void;
};

const ContextoDePermisos = createContext<ValorDePermisos | null>(null);

async function leerPermisos(idUsuario: string): Promise<Permisos> {
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('id_rol, roles(clave)')
    .eq('id', idUsuario)
    .maybeSingle();
  if (!perfil) return SIN_PERMISOS;

  const fila = perfil as unknown as { id_rol: number; roles: { clave: string } | null };
  const { data: claves } = await supabase.from('permisos_rol').select('clave_permiso').eq('id_rol', fila.id_rol);
  const tiene = new Set(((claves ?? []) as { clave_permiso: string }[]).map((c) => c.clave_permiso));

  const publicar = tiene.has('noticias_publicar');
  const moderar = tiene.has('noticias_moderar');
  const administrar = tiene.has('usuarios_administrar');
  return { rol: fila.roles?.clave ?? null, publicar, moderar, administrar, redaccion: publicar || moderar || administrar };
}

export function ProveedorDePermisos({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const idUsuario = sesion?.user.id ?? null;
  const [leidos, setLeidos] = useState<{ de: string; permisos: Permisos } | null>(null);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    if (idUsuario === null) return;
    let vigente = true;
    leerPermisos(idUsuario)
      .then((permisos) => {
        if (vigente) setLeidos({ de: idUsuario, permisos });
      })
      .catch(() => {
        if (vigente) setLeidos({ de: idUsuario, permisos: SIN_PERMISOS });
      });
    return () => {
      vigente = false;
    };
  }, [idUsuario, vuelta]);

  const recargar = useCallback(() => setVuelta((v) => v + 1), []);

  // Sin sesión, o con los permisos de otra cuenta todavía en memoria, no se
  // muestra nada de la redacción.
  const propios = idUsuario !== null && leidos?.de === idUsuario;
  const permisos = propios ? leidos.permisos : SIN_PERMISOS;
  const listos = idUsuario === null || propios;

  return (
    <ContextoDePermisos.Provider value={{ ...permisos, listos, recargar }}>{children}</ContextoDePermisos.Provider>
  );
}

export function usePermisos(): ValorDePermisos {
  const valor = useContext(ContextoDePermisos);
  if (valor === null) throw new Error('usePermisos se usa dentro de ProveedorDePermisos');
  return valor;
}
