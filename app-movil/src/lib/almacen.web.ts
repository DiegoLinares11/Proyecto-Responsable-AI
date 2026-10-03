// En la web el navegador ya trae `localStorage`; no hace falta instalar nada.
export const almacen = typeof window === 'undefined' ? undefined : window.localStorage;
