// Prueba de geometría de la web con insets simulados; no ejecuta iOS/Android.
// Ver docs/verificacion-dispositivos.md para instalación aislada y límites.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_PATH
  ? pathToFileURL(resolve(process.env.PLAYWRIGHT_PATH)).href : 'playwright');
const web = resolve(process.env.WEB_EXPORT_DIR ?? 'app-movil/dist');
const origen = 'http://127.0.0.1:8766';
const casos = [
  { nombre: 'sin-recorte', width: 360, height: 800, top: 0, bottom: 0, left: 0, right: 0 },
  { nombre: 'isla', width: 393, height: 852, top: 59, bottom: 34, left: 0, right: 0 },
  { nombre: 'notch', width: 375, height: 812, top: 44, bottom: 34, left: 0, right: 0 },
  { nombre: 'android-gestos', width: 360, height: 800, top: 32, bottom: 24, left: 0, right: 0 },
  { nombre: 'android-botones', width: 360, height: 800, top: 24, bottom: 48, left: 0, right: 0 },
  { nombre: 'horizontal-recorte', width: 844, height: 390, top: 0, bottom: 21, left: 59, right: 59 },
  { nombre: 'tableta-laterales', width: 1194, height: 834, top: 24, bottom: 20, left: 32, right: 32 },
].filter(c => !process.env.SAFE_AREA_CASE || c.nombre === process.env.SAFE_AREA_CASE);
assert.ok(casos.length > 0, 'SAFE_AREA_CASE debe coincidir con un escenario existente.');

const noticia = {
  id: 'demo-0', titulo: 'Una noticia para revisar el espacio de lectura', resumen: 'Resumen de prueba para verificar la interfaz en distintas áreas seguras.',
  cuerpo: 'Texto de prueba para verificar la lectura y sus acciones.\n\nSegundo párrafo de la noticia de prueba.',
  publicada_en: new Date().toISOString(), seccion: 'cultura', url_imagen: null, credito_imagen: null, texto_alterno_imagen: null, origen_imagen: 'ilustracion', url_fuente_imagen: null,
  puntaje_veracidad: 85, relevancia: 100, alcance: 'nacional', pais: 'GT', id_ubicacion: null, fuentes: { nombre: 'Fuente de prueba' }, ubicaciones: null,
  componente_interacciones: 1, componente_verificadas: 1, componente_fuente: 1, componente_veracidad: 1, url_original: 'https://example.com',
};
const user = { id: '00000000-0000-0000-0000-000000000001', email: 'prueba@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: { name: 'Prueba' }, app_metadata: {}, created_at: new Date().toISOString() };
const jwt = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.preview`;
const errores = [];
const fallos = [];
let comprobaciones = 0;
const browser = await chromium.launch();

try {
  for (const caso of casos) for (const tema of ['claro', 'oscuro']) {
    console.log(`Revisando ${caso.nombre}/${tema}`);
    const context = await browser.newContext({ viewport: { width: caso.width, height: caso.height }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errores.push(error.message));
      await page.addInitScript(({ user, jwt, tema }) => {
        localStorage.setItem('sb-preview-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'preview', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }));
        localStorage.setItem('noticias.apariencia', tema);
      }, { user, jwt, tema });
      // Todo el sitio se sirve por interceptación; no hace falta levantar un servidor.
      await page.route(`${origen}/**`, route => {
        const path = decodeURIComponent(new URL(route.request().url()).pathname);
        const archivo = route.request().resourceType() === 'document'
          ? (path.startsWith('/noticia/') ? 'noticia/[id].html' : `${path.slice(1) || 'index'}.html`)
          : path.slice(1);
        const absoluta = resolve(web, archivo);
        if (!absoluta.startsWith(web + '/')) return route.abort();
        return route.fulfill({ path: absoluta });
      });
      await page.route('https://preview.supabase.co/**', route => {
        const url = new URL(route.request().url());
        let data = [];
        if (url.pathname.endsWith('/noticias')) data = url.searchParams.has('id') ? noticia : [noticia];
        if (url.pathname.endsWith('/ubicaciones')) data = [{ id: 'GT-GU', nombre: 'Guatemala', pais: 'GT', tipo: 'departamento' }];
        if (url.pathname.endsWith('/usuarios')) data = { id_rol: 2, roles: { clave: 'publicador' } };
        if (url.pathname.endsWith('/permisos_rol')) data = [{ clave_permiso: 'noticias_publicar' }];
        if (url.pathname.endsWith('/preferencias_usuario')) data = null;
        return route.fulfill({ json: data });
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: caso.top, bottom: caso.bottom, left: caso.left, right: caso.right } });
      async function revisar(locator, etiqueta, inferior = true) {
        const box = await locator.boundingBox();
        if (!box) { fallos.push(`${caso.nombre}/${tema}/${etiqueta}: no visible`); return; }
        comprobaciones++;
        if (box.x < caso.left - 1 || box.x + box.width > caso.width - caso.right + 1 || box.y < caso.top - 1 || (inferior && box.y + box.height > page.viewportSize().height - caso.bottom + 1)) {
          fallos.push(`${caso.nombre}/${tema}/${etiqueta}: ${JSON.stringify(box)}`);
        }
      }
      await page.goto(`${origen}/feed`);
      await page.getByRole('heading', { name: 'La portada', exact: true }).waitFor();
      const insetReal = await page.evaluate(() => {
        const probe = document.createElement('div'); probe.style.paddingTop = 'env(safe-area-inset-top)'; document.body.appendChild(probe);
        const valor = parseFloat(getComputedStyle(probe).paddingTop); probe.remove(); return valor;
      });
      assert.equal(insetReal, caso.top, 'El motor debe exponer los insets simulados.');
      await revisar(page.getByRole('button', { name: /Ubicación simulada:/ }), 'ubicacion-portada');
      await revisar(page.getByRole('button', { name: 'Abrir menú editorial' }), 'boton-menu');
      await page.getByRole('button', { name: 'Abrir menú editorial' }).click();
      await page.getByRole('dialog', { name: 'Menú editorial' }).waitFor();
      await revisar(page.getByRole('button', { name: 'Cerrar menú editorial' }), 'cerrar-menu');
      const perfil = page.getByRole('dialog', { name: 'Menú editorial' }).getByRole('link', { name: 'Perfil', exact: true });
      await perfil.scrollIntoViewIfNeeded(); await revisar(perfil, 'enlace-menu-perfil');
      await page.getByRole('button', { name: 'Cerrar menú editorial' }).click();
      await page.getByRole('dialog', { name: 'Menú editorial' }).waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: /Ubicación simulada:/ }).click();
      await page.getByRole('heading', { name: 'Atlas de noticias' }).waitFor();
      await page.waitForTimeout(350); // Transición nativa/web de la hoja.
      await revisar(page.getByRole('button', { name: 'Listo', exact: true }), 'cerrar-atlas');
      const zona = page.getByRole('button', { name: /^Guatemala/ });
      await zona.scrollIntoViewIfNeeded(); await revisar(zona, 'opcion-atlas'); await zona.click();
      await page.goto(`${origen}/`);
      await page.getByRole('textbox', { name: 'Tu pregunta' }).waitFor();
      await revisar(page.getByRole('button', { name: /Cambiar ubicación del asistente/ }), 'ubicacion-chat');
      await revisar(page.getByRole('textbox', { name: 'Tu pregunta' }), 'entrada-chat');
      await revisar(page.getByRole('button', { name: 'Enviar pregunta' }), 'enviar-chat');
      if (caso.height > 700) {
        await page.setViewportSize({ width: caso.width, height: caso.height - 280 });
        await revisar(page.getByRole('textbox', { name: 'Tu pregunta' }), 'entrada-viewport-reducido');
        await revisar(page.getByRole('button', { name: 'Enviar pregunta' }), 'enviar-viewport-reducido');
        await page.setViewportSize({ width: caso.width, height: caso.height });
      }
      await page.goto(`${origen}/perfil`);
      await page.getByRole('heading', { name: 'Perfil', exact: true }).waitFor();
      await revisar(page.getByRole('heading', { name: 'Perfil', exact: true }), 'titulo-perfil', false);
      await page.goto(`${origen}/redaccion`);
      await page.getByRole('textbox', { name: 'Titular', exact: true }).waitFor();
      await revisar(page.getByRole('heading', { name: 'Redacción', exact: true }), 'titulo-redaccion', false);
      const publicar = page.getByRole('button', { name: 'Enviar a validación', exact: true });
      await publicar.scrollIntoViewIfNeeded(); await revisar(publicar, 'enviar-redaccion');
      await page.goto(`${origen}/noticia/demo-0`);
      await page.getByRole('heading', { name: noticia.titulo, exact: true }).waitFor();
      await revisar(page.getByRole('heading', { name: noticia.titulo, exact: true }), 'titulo-lectura', false);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ escenarios: casos.length * 2, comprobaciones, fallos, errores }, null, 2));
assert.deepEqual(fallos, []);
assert.deepEqual(errores, []);
