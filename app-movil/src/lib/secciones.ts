// Copia de src/lib/secciones.ts del portal: son dos paquetes y Metro no
// importa fuera de app-movil/. Una prueba del repositorio
// (tests/unit/noticias/secciones.test.ts) compara las dos listas con el enum de
// la base, para que no se desincronicen en silencio.

export type SeccionDeNoticia =
  | 'general'
  | 'guatemala'
  | 'mundo'
  | 'politica'
  | 'economia'
  | 'deportes'
  | 'cultura'
  | 'tecnologia';

export const SECCIONES: readonly { clave: SeccionDeNoticia; nombre: string }[] = [
  { clave: 'general', nombre: 'Última hora' },
  { clave: 'guatemala', nombre: 'Guatemala' },
  { clave: 'mundo', nombre: 'Mundo' },
  { clave: 'politica', nombre: 'Política' },
  { clave: 'economia', nombre: 'Economía' },
  { clave: 'deportes', nombre: 'Deportes' },
  { clave: 'cultura', nombre: 'Cultura' },
  { clave: 'tecnologia', nombre: 'Tecnología' },
];

export function nombreDeSeccion(clave: string): string {
  return SECCIONES.find((s) => s.clave === clave)?.nombre ?? 'Noticias';
}
