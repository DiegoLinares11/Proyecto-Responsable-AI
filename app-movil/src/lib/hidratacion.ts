import { useSyncExternalStore } from 'react';

const suscribir = () => () => {};
const cliente = () => true;
const servidor = () => false;

/** La exportación y la primera renderización deben usar la misma disposición. */
export function useHidratado() {
  return useSyncExternalStore(suscribir, cliente, servidor);
}
