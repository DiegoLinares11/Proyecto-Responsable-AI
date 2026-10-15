import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { almacen } from './almacen';
import { useHidratado } from './hidratacion';

export type Apariencia = 'sistema' | 'claro' | 'oscuro';
const CLAVE = 'noticias.apariencia';
const Contexto = createContext<{
  apariencia: Apariencia;
  esquema: 'light' | 'dark';
  cambiar: (valor: Apariencia) => void;
} | null>(null);

/** Preferencia del dispositivo: no depende de iniciar sesión ni viaja al servidor. */
export function ProveedorDeApariencia({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const hidratado = useHidratado();
  const [apariencia, setApariencia] = useState<Apariencia>('sistema');
  const cambioManual = useRef(false);

  useEffect(() => {
    let vigente = true;
    // La lectura ocurre después de hidratar, también en la exportación estática.
    Promise.resolve().then(() => {
      try {
        const guardada = almacen?.getItem(CLAVE);
        if (vigente && !cambioManual.current && (guardada === 'claro' || guardada === 'oscuro')) {
          setApariencia(guardada);
        }
      } catch {
        // El modo sigue funcionando si el navegador bloquea el almacenamiento.
      }
    });
    return () => { vigente = false; };
  }, []);

  function cambiar(valor: Apariencia) {
    cambioManual.current = true;
    setApariencia(valor);
    try {
      almacen?.setItem(CLAVE, valor);
    } catch {
      // La selección permanece disponible durante esta sesión.
    }
  }

  const esquema = apariencia === 'sistema' ? (hidratado && sistema === 'dark' ? 'dark' : 'light') : apariencia === 'oscuro' ? 'dark' : 'light';
  return <Contexto.Provider value={{ apariencia, esquema, cambiar }}>{children}</Contexto.Provider>;
}

export function useApariencia() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('La apariencia requiere ProveedorDeApariencia.');
  return valor;
}
