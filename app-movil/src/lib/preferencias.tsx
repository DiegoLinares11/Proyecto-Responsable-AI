// ===========================================================================
// La ubicación simulada y las lecturas del usuario
//
// Con sesión, la ubicación vive en `preferencias_usuario`: una fila que solo su
// dueño ve y toca (la política lo exige, ni un moderador la lee). Sin sesión,
// vive en el teléfono, para que la portada se pueda comparar entre ubicaciones
// aun sin cuenta.
//
// Las lecturas son la única señal de interés: las noticias que el usuario abrió
// en los últimos 30 días, contadas desde que reinició sus intereses. El chat NO
// cuenta: lo que alguien le pregunta a un asistente no es una preferencia
// declarada, y usarlo para ordenarle el feed sería vigilarlo.
// ===========================================================================

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { almacen } from './almacen';
import type { Lectura, Ubicacion } from './personalizacion';
import { useSesion } from './sesion';
import { supabase } from './supabase';

export type UbicacionDisponible = Ubicacion & { tipo: 'departamento' | 'pais' };

const POR_OMISION: UbicacionDisponible = { id: 'GT-GU', nombre: 'Guatemala', pais: 'GT', tipo: 'departamento' };
const CLAVE_LOCAL = 'noticias-verificadas.ubicacion';
const DIAS_DE_HISTORIAL = 30;

type ValorDePreferencias = {
  ubicaciones: UbicacionDisponible[];
  ubicacion: UbicacionDisponible;
  cambiarUbicacion: (id: string) => Promise<void>;
  lecturas: Lectura[];
  interesesDesde: string | null;
  registrarLectura: (idNoticia: string) => Promise<void>;
  reiniciarIntereses: () => Promise<void>;
};

const Contexto = createContext<ValorDePreferencias | null>(null);

export function ProveedorDePreferencias({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const idUsuario = sesion?.user.id ?? null;

  const [ubicaciones, setUbicaciones] = useState<UbicacionDisponible[]>([POR_OMISION]);
  const [idUbicacion, setIdUbicacion] = useState<string>(POR_OMISION.id);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [interesesDesde, setInteresesDesde] = useState<string | null>(null);

  // La lista cerrada de ubicaciones: datos de referencia, públicos.
  useEffect(() => {
    let vigente = true;
    supabase
      .from('ubicaciones')
      .select('id,nombre,pais,tipo')
      .order('orden')
      .order('nombre')
      .then(({ data }) => {
        if (vigente && data) setUbicaciones(data as UbicacionDisponible[]);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const leerLecturas = useCallback(async (usuario: string, desdeReinicio: string | null) => {
    const hace30 = new Date(Date.now() - DIAS_DE_HISTORIAL * 86_400_000).toISOString();
    const desde = desdeReinicio !== null && desdeReinicio > hace30 ? desdeReinicio : hace30;

    const { data } = await supabase
      .from('interacciones')
      .select('creado_en,noticias(seccion)')
      .eq('tipo', 'lectura')
      .eq('id_usuario', usuario)
      .gte('creado_en', desde);

    return ((data ?? []) as unknown as { noticias: { seccion: string } | null }[])
      .filter((f) => f.noticias !== null)
      .map((f) => ({ seccion: f.noticias!.seccion }));
  }, []);

  // Al cambiar la sesión: de dónde sale la ubicación, y las lecturas propias.
  useEffect(() => {
    let vigente = true;

    (async () => {
      if (idUsuario === null) {
        const guardada = almacen?.getItem(CLAVE_LOCAL) ?? null;
        if (vigente) {
          setIdUbicacion(guardada ?? POR_OMISION.id);
          setLecturas([]);
          setInteresesDesde(null);
        }
        return;
      }

      const { data } = await supabase
        .from('preferencias_usuario')
        .select('id_ubicacion,intereses_desde')
        .eq('id_usuario', idUsuario)
        .maybeSingle();

      const fila = data as { id_ubicacion: string; intereses_desde: string | null } | null;
      const desde = fila?.intereses_desde ?? null;
      const leidas = await leerLecturas(idUsuario, desde);

      if (vigente) {
        // Si nunca eligió, se respeta lo que había elegido sin cuenta.
        setIdUbicacion(fila?.id_ubicacion ?? almacen?.getItem(CLAVE_LOCAL) ?? POR_OMISION.id);
        setInteresesDesde(desde);
        setLecturas(leidas);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [idUsuario, leerLecturas]);

  async function cambiarUbicacion(id: string) {
    setIdUbicacion(id);
    almacen?.setItem(CLAVE_LOCAL, id);
    if (idUsuario !== null) {
      await supabase
        .from('preferencias_usuario')
        .upsert({ id_usuario: idUsuario, id_ubicacion: id, actualizado_en: new Date().toISOString() });
    }
  }

  async function registrarLectura(idNoticia: string) {
    if (idUsuario === null) return;
    // Una lectura por noticia y por usuario: la restricción de unicidad de la
    // base. Volver a abrir la misma nota no vuelve a contar, y el error de
    // duplicado se ignora a propósito.
    const { error } = await supabase
      .from('interacciones')
      .insert({ id_noticia: idNoticia, id_usuario: idUsuario, tipo: 'lectura' });
    if (error === null) setLecturas(await leerLecturas(idUsuario, interesesDesde));
  }

  async function reiniciarIntereses() {
    if (idUsuario === null) return;
    const ahora = new Date().toISOString();
    await supabase
      .from('preferencias_usuario')
      .upsert({ id_usuario: idUsuario, id_ubicacion: idUbicacion, intereses_desde: ahora, actualizado_en: ahora });
    setInteresesDesde(ahora);
    setLecturas([]);
  }

  const ubicacion = ubicaciones.find((u) => u.id === idUbicacion) ?? POR_OMISION;

  return (
    <Contexto.Provider
      value={{ ubicaciones, ubicacion, cambiarUbicacion, lecturas, interesesDesde, registrarLectura, reiniciarIntereses }}>
      {children}
    </Contexto.Provider>
  );
}

export function usePreferencias(): ValorDePreferencias {
  const valor = useContext(Contexto);
  if (valor === null) throw new Error('usePreferencias se usa dentro de ProveedorDePreferencias');
  return valor;
}
