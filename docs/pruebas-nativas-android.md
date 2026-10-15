# Pruebas de interfaz nativa en Android

## Resultado — 15 de octubre de 2026

**4 escenarios completos y 36 comprobaciones geométricas correctas**, ejecutadas
con la app React Native dentro de Expo Go, no en una página web.

Entorno: Android Emulator 37.2.12 con KVM, Android 16 / API 36, imagen
`google_apis;x86_64`, perfil base Pixel 7 y Expo Go 57.0.9. Se cambiaron tamaño,
densidad, recorte, navegación y escala de texto del sistema en un emulador
dedicado. Esto no representa cuatro teléfonos físicos ni todas las versiones
o personalizaciones de Android.

| Escenario | Resolución | Densidad | Texto | Recorte Android | Navegación | Tema | Resultado |
|---|---|---:|---:|---|---|---|---|
| Amplio claro | 1080 × 2400 | 420 dpi | 100 % | Perforación | Gestos | Claro | Correcto |
| Amplio oscuro | 1080 × 2400 | 420 dpi | 100 % | Perforación | Gestos | Oscuro | Correcto |
| Compacto claro | 720 × 1600 | 320 dpi | 130 % | Recorte alto | Tres botones | Claro | Correcto |
| Compacto oscuro | 720 × 1600 | 320 dpi | 130 % | Recorte alto | Tres botones | Oscuro | Correcto |

## Recorrido ejecutado

En cada escenario se hizo lo siguiente:

1. Carga limpia de Expo Go y apertura de una sesión de prueba local.
2. Cambio de apariencia desde Perfil y navegación a Portada.
3. Apertura/cierre del menú editorial; comprobación del botón de cierre.
4. Apertura del atlas, desplazamiento y elección de Quetzaltenango.
5. Entrada al chat, apertura del **teclado Android real** y escritura de dos líneas.
6. Comprobación de la entrada y del envío por encima del teclado y de la barra
   del sistema; envío de una consulta al backend simulado.
7. Desplazamiento hasta las fuentes y apertura de la noticia citada.
8. Acceso a las comprobaciones desde las notas al margen y regreso con Atrás.
9. Apertura de Redacción, escritura de un titular y desplazamiento hasta
   «Enviar a validación» con el teclado abierto. No se envió una publicación.

El runner obtiene los recortes y las áreas de barras/teclado de
`adb shell dumpsys window displays`, y compara los controles de UI Automator
contra esos límites. Cada escenario guarda capturas de portada, menú, atlas,
teclado, respuesta, lectura y formulario. `resultados.json` indica explícitamente
si la ejecución terminó bien o falló y qué escenarios se completaron.

La rueda flotante «Tools» que aparece en algunas capturas pertenece a Expo Go.

## Problemas encontrados y correcciones verificadas

### El teclado cubría el compositor del chat

Antes de la corrección, en el perfil amplio, el teclado empezaba en `y=1517`
mientras el botón de envío terminaba en `y=2095`: el control quedaba detrás.
Con el ajuste, el botón termina en `y=1486`, por encima del teclado.

Se activó `KeyboardAvoidingView` con `height` en Android. El chat conserva el
offset del origen de su columna; Redacción, cuyo contenedor es hijo directo
del área segura, no añade ese offset otra vez. Ambas pantallas mantienen
`padding` en iOS; ese comportamiento aún necesita ejecución nativa en iOS.

### Encabezado demasiado estrecho con texto ampliado

En el perfil compacto al 130 %, «Cuaderno de contexto» se dividía incluso
dentro de la palabra «Cuaderno», por competir con la ubicación en la misma fila.
Se agrupó icono/título, se permitió que la ubicación use otra fila y se muestra
«Cuaderno» en pantallas estrechas. Su nombre accesible sigue siendo completo.

## Alcance del backend de prueba

`scripts/fixture_ui_nativa.mjs` sirve noticias, una cuenta y respuestas simuladas
desde `127.0.0.1:8768`. La app se inicia apuntando explícitamente a ese backend.
La sesión se entrega por el enlace profundo que ya maneja la aplicación y se
valida contra el servidor local de prueba.

Se probaron vistas, gestos, teclado y navegación nativos. No se validaron el
login real con Google, las políticas de Supabase, el modelo ni la veracidad de
las noticias. La prueba no consume tokens ni usa cuentas reales.

## Repetir la prueba

Requisitos: SDK Android con `adb`, un emulador dedicado en ejecución, Expo Go
compatible con SDK 57, Node y Python 3. El runner rechaza dispositivos físicos;
**borra los datos de Expo Go en el emulador** entre escenarios para garantizar
una carga limpia. No usarlo en un emulador con sesiones que se quieran conservar.

Desde la raíz, dejar corriendo el fixture:

```bash
node scripts/fixture_ui_nativa.mjs
```

En otra terminal, desde `app-movil/`, iniciar Metro en un puerto libre:

```bash
CI=1 REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 EXPO_NO_DOTENV=1 EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:8768 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=preview-key EXPO_PUBLIC_API_URL=http://127.0.0.1:8768 npx expo start --port 8097 --host lan --no-dev --minify --clear
```

Desde la raíz, con el serial de ese emulador:

```bash
adb -s emulator-5554 reverse tcp:8097 tcp:8097
adb -s emulator-5554 reverse tcp:8768 tcp:8768
ANDROID_SERIAL=emulator-5554 METRO_PORT=8097 python3 scripts/verificar_android.py
```

Si `adb` no está en PATH, definir `ADB` con su ruta. `ANDROID_EVIDENCE_DIR`
cambia el directorio de capturas y JSON; por omisión es `/tmp/noticias-android`.
`ANDROID_TEST_CASE=compacto-oscuro-botones` permite repetir un único escenario.

El runner restaura tamaño, densidad, escala de texto y la modalidad de navegación
al finalizar, y desactiva los dos overlays de recorte utilizados. El SDK y las
imágenes del emulador no forman parte del repositorio.

## Pendientes de compatibilidad

- **iOS nativo:** pendiente de un Mac con iOS Simulator o un iPhone. Linux no
  ejecuta el simulador de iOS. Ni estas pruebas Android ni las simulaciones de
  navegador sustituyen esa pasada.
- **Teléfonos Android físicos:** pendientes, especialmente personalizaciones
  de Samsung/Xiaomi y otras versiones del sistema.
- Texto al 200 %, TalkBack/VoiceOver y pruebas de rendimiento requieren sus
  propias pasadas; no están incluidos en los cuatro escenarios anteriores.

El recorrido manual y la suite web están en
[verificacion-dispositivos.md](verificacion-dispositivos.md).
