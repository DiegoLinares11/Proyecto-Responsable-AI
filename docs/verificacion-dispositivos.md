# Verificación de áreas seguras en dispositivos

## Resultado de la revisión — 15 de octubre de 2026

- **Web, Chromium 156 / Playwright 1.64.1:** 14 escenarios, 206 comprobaciones
  geométricas, cero interferencias detectadas y cero errores de JavaScript.
- **Android e iOS:** generación de bundles Metro/Hermes correcta para ambos.
  Esto comprueba empaquetado, no una ejecución visual nativa.
- **Lint, TypeScript y exportación web:** correctos.
- **Android nativo emulado:** después de instalar las herramientas en un
  entorno temporal, pasaron 4 escenarios y 36 comprobaciones con Android 16,
  teclado real, gestos/tres botones y texto hasta el 130 %. Resultado y pasos
  reproducibles en [pruebas-nativas-android.md](pruebas-nativas-android.md).
- **iOS nativo y teléfonos físicos:** pendientes; no hay Mac ni dispositivos
  físicos disponibles en esta sesión.

La suite usa noticias y una cuenta publicadora simuladas. No necesita acceso a
Supabase, Google ni al modelo, y no envía publicaciones ni preguntas reales.

## Qué significa proteger el notch o una isla

No se detecta la cámara ni se piden permisos para ella. El sistema informa los
**insets**: márgenes superior, inferior, izquierdo y derecho que el contenido
debe respetar. En web, su equivalente es `env(safe-area-inset-*)`.

Se protege la posición de los controles y el contenido importante. El fondo
puede extenderse por toda la pantalla.

## Escenarios automatizados

Valores de prueba en píxeles CSS; no son una certificación de modelos concretos.
Cada fila se ejecuta en claro y oscuro.

| Escenario | Ventana | Arriba | Abajo | Izquierda | Derecha |
|---|---|---:|---:|---:|---:|
| Sin recorte | 360 × 800 | 0 | 0 | 0 | 0 |
| Isla superior | 393 × 852 | 59 | 34 | 0 | 0 |
| Notch | 375 × 812 | 44 | 34 | 0 | 0 |
| Android con gestos | 360 × 800 | 32 | 24 | 0 | 0 |
| Android con botones | 360 × 800 | 24 | 48 | 0 | 0 |
| Horizontal con recorte lateral | 844 × 390 | 0 | 21 | 59 | 59 |
| Ventana ancha con márgenes laterales | 1194 × 834 | 24 | 20 | 32 | 32 |

`scripts/verificar_areas_seguras.mjs` aplica los insets con
`Emulation.setSafeAreaInsetsOverride`, verifica que el navegador los esté
exponiendo y compara las cajas de los controles contra la región utilizable
(tolerancia de un píxel por redondeo).

Se revisan ubicación de portada, apertura/cierre del menú, navegación dentro del
menú, cierre y selección del atlas, entrada y envío del chat, Perfil, Redacción
y lectura. En ventanas altas también se reduce la altura en 280 píxeles y se
comprueba que el compositor del chat siga visible. **Reducir el viewport no
equivale a abrir un teclado de iOS o Android.**

### Repetir la prueba

Instalar la herramienta aislada del proyecto, desde la raíz del repositorio:

```bash
npm install --prefix /tmp/noticias-verificacion playwright@1.64.1 --no-package-lock
npx --prefix /tmp/noticias-verificacion playwright install chromium
```

Desde `app-movil/`, exportar una versión con configuración de prueba:

```bash
EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=https://preview.supabase.co EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=preview-key npx expo export --platform web --output-dir /tmp/noticias-web
```

Desde la raíz del repositorio:

```bash
PLAYWRIGHT_PATH=/tmp/noticias-verificacion/node_modules/playwright/index.mjs WEB_EXPORT_DIR=/tmp/noticias-web node scripts/verificar_areas_seguras.mjs
```

La suite intercepta los documentos, assets y respuestas de Supabase; no hace
falta levantar un servidor HTTP. Para aislar una fila, usar, por ejemplo,
`SAFE_AREA_CASE=horizontal-recorte` junto con las variables anteriores.

## Correcciones realizadas

La primera medición encontró 28 interferencias en los escenarios simulados.

- La barra inferior web reserva ahora el espacio del indicador de gestos.
- El navegador web aplica los márgenes superiores y laterales una sola vez;
  en disposición ancha también protege el borde inferior.
- Los anchos de columnas se calculan a partir del espacio disponible después
  de descontar los márgenes laterales.
- Las pantallas nativas protegen arriba y los costados. Las barras nativas
  mantienen su manejo de insets; el chat de iOS usa manejo manual del borde
  inferior para proteger también su compositor fijo.
- El chat de iOS usa el inset superior en lugar de un offset fijo de 90.
- Los modales miden su propia área segura, incluida la hoja del atlas.
- El atlas móvil vive fuera de `FlatList`: un modal conserva el contexto React
  de su padre y la lista del atlas se interpretaba como una lista anidada,
  perdiendo su desplazamiento independiente en ventanas bajas.
- La lectura protege laterales y fondo; su cabecera conserva el manejo del
  navegador Stack.
- El HTML web declara `viewport-fit=cover`, conserva el zoom y usa `lang="es"`.

## Comprobación que falta en teléfonos reales

Abrir la app con Expo Go compatible con SDK 57, usando las variables reales
según `app-movil/README.md`. Probar al menos un iPhone con notch o Dynamic Island
y un Android con cámara perforada. En Android, repetir con navegación por
gestos y, si está disponible, con tres botones.

En cada dispositivo y en ambos temas:

1. Abrir Portada, Chat, Perfil y una noticia. Comprobar logo, ubicación, volver,
   pestañas y controles superiores.
2. Abrir el menú y el atlas. Recorrerlos hasta el final, cerrar y volver a abrir.
   El último control debe quedar por encima del indicador de gestos.
3. Con sesión, escribir una pregunta de varias líneas, abrir/cerrar el teclado
   y enviar. La entrada y el botón deben ser accesibles por encima del teclado
   y de la barra nativa, sin un hueco adicional por doble aplicación de insets.
4. Con permiso de publicación, llegar al final del formulario y comprobar el
   botón de envío con el teclado abierto y cerrado.
5. Aumentar el tamaño del texto del sistema y repetir las acciones esenciales.
6. Probar Safari en iPhone y Chrome en Android para la versión web; revisar
   además el cambio de orientación y la barra del navegador expandida/retraída.

La app nativa está configurada en **vertical** (`orientation: portrait`); la
prueba horizontal automatizada corresponde a la web. No se cambió esa decisión.

Registrar modelo, versión del sistema, Expo Go/build, tema, pantalla, estado del
teclado y captura si se encuentra un problema. Hasta completar esta pasada,
la compatibilidad visual de iOS y de teléfonos físicos sigue **pendiente**.
La ejecución nativa Android en los cuatro perfiles emulados ya está comprobada.

## Referencias

- [Expo SDK 57: Safe Area Context](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/)
- [Native Tabs: manejo de áreas seguras](https://docs.expo.dev/router/advanced/native-tabs/#safe-area-handling)
- [Chrome DevTools Protocol: Emulation](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/)
