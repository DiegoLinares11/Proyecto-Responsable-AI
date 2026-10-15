// Backend local de pruebas de interfaz. Nunca se importa desde la aplicación.
import { createServer } from 'node:http';

const usuario = { id: '00000000-0000-0000-0000-000000000001', email: 'prueba@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'google' }, user_metadata: { full_name: 'Lector de prueba' }, created_at: new Date().toISOString() };
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: usuario.id, exp: Math.floor(Date.now() / 1000) + 86400, role: 'authenticated' })).toString('base64url')}.preview`;
const sesion = { access_token: token, refresh_token: 'preview-refresh', expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400, token_type: 'bearer', user: usuario };
const titulos = ['El festival de cine anuncia su selección centroamericana', 'La selección nacional prepara su próximo encuentro', 'Nuevos acuerdos internacionales sobre energía', 'Un programa municipal recupera espacios públicos', 'La universidad presenta investigaciones sobre el agua', 'Comunidades comparten nuevas iniciativas culturales'];
const noticias = titulos.map((titulo, i) => ({
  id: `demo-${i}`, titulo, resumen: 'Las fuentes publicadas explican el alcance del anuncio y las próximas etapas. Esta noticia forma parte del conjunto de prueba.',
  cuerpo: 'Las organizaciones participantes explicaron el alcance de la iniciativa y sus primeras etapas.\n\nLos siguientes avances se publicarán cuando exista nueva evidencia.',
  publicada_en: new Date().toISOString(), seccion: ['cultura', 'deportes', 'mundo', 'guatemala', 'tecnologia', 'cultura'][i], url_imagen: null, credito_imagen: null, texto_alterno_imagen: null, origen_imagen: 'ilustracion', url_fuente_imagen: null,
  puntaje_veracidad: 85, relevancia: 100 - i * 10, alcance: i === 0 || i === 3 ? 'local' : i === 2 ? 'internacional' : 'nacional', pais: 'GT', id_ubicacion: 'GT-GU', fuentes: { nombre: ['Prensa Libre', 'BBC', 'Reuters'][i % 3] }, ubicaciones: i === 0 || i === 3 ? { nombre: 'Guatemala' } : null,
  componente_interacciones: 1, componente_verificadas: 2, componente_fuente: 3, componente_veracidad: 4, url_original: 'https://example.com/noticia',
}));
const ubicaciones = [{ id: 'GT-GU', nombre: 'Guatemala', pais: 'GT', tipo: 'departamento' }, { id: 'GT-QZ', nombre: 'Quetzaltenango', pais: 'GT', tipo: 'departamento' }, { id: 'GT-PE', nombre: 'Petén', pais: 'GT', tipo: 'departamento' }, { id: 'MX', nombre: 'México', pais: 'MX', tipo: 'pais' }];
let consultas = 0;
createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8768');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  res.setHeader('content-type', 'application/json');
  if (req.method === 'OPTIONS') return res.end();
  let datos = [];
  if (url.pathname === '/fixture') datos = { sesion, consultas };
  else if (url.pathname === '/auth/v1/user') datos = usuario;
  else if (url.pathname === '/auth/v1/token') datos = sesion;
  else if (url.pathname === '/rest/v1/noticias') { const id = url.searchParams.get('id'); datos = id?.startsWith('eq.') ? noticias.find(n => `eq.${n.id}` === id) ?? null : noticias; }
  else if (url.pathname === '/rest/v1/ubicaciones') datos = ubicaciones;
  else if (url.pathname === '/rest/v1/usuarios') datos = { id_rol: 4, roles: { clave: 'administrador' } };
  else if (url.pathname === '/rest/v1/permisos_rol') datos = ['noticias_publicar', 'noticias_moderar', 'usuarios_administrar'].map(clave_permiso => ({ clave_permiso }));
  else if (url.pathname === '/rest/v1/preferencias_usuario') datos = req.method === 'GET' ? { id_ubicacion: 'GT-GU', intereses_desde: null } : null;
  else if (url.pathname === '/rest/v1/validaciones') datos = [{ senal: 'credibilidad_fuente', aporte: 25, disponible: true, detalle: { maximo: 25, explicacion: 'Fuente contrastada en datos de prueba.' } }, { senal: 'corroboracion', aporte: 0, disponible: false, detalle: { maximo: 25, explicacion: 'Comprobación incompleta de prueba.' } }];
  else if (url.pathname === '/api/chat') { consultas++; datos = { respuesta: 'Las noticias publicadas presentan nuevos anuncios e iniciativas de la región.\n\nLas fuentes citadas permiten revisar su contexto y sus próximos pasos.', bloqueado: false, capaQueCorto: null, categoria: null, noticiasCitadas: ['demo-0', 'demo-2'], confianza: 'media' }; }
  else if (url.pathname === '/api/redaccion/moderacion') datos = { cola: [], alertas: [] };
  else if (url.pathname === '/api/redaccion/cuentas') datos = { cuentas: [], cambios: [], yo: usuario.id };
  else if (url.pathname === '/api/redaccion/fotos') datos = { fotos: [] };
  else if (url.pathname === '/api/redaccion/publicar') datos = { ok: 'Validación simulada completada.', idNoticia: 'demo-0', estado: 'verificada', puntaje: 85 };
  res.end(JSON.stringify(datos));
}).listen(8768, '127.0.0.1', () => console.log('Fixture UI disponible en http://127.0.0.1:8768'));
