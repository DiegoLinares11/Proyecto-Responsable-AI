# Noticias Verificadas — app móvil

App nativa para iPhone y Android, hecha con Expo (SDK 57) y React Native. Se
prueba en clase con **Expo Go**, sin publicarla en tiendas y sin cuentas de
desarrollador pagas. En Android también se puede instalar con su propio ícono
desde un link (ver «Compartirla por un link»).

Pantallas: **Chat** (la inicial), **Portada** con jerarquía de diario, **lectura**
de cada noticia con su ficha de validación, y **Perfil**.

## Cómo está armada

- **Las lecturas van directo a Supabase** con la llave publicable. Lo que la app
  puede ver lo deciden las políticas de fila de la base —las mismas del portal—:
  un borrador no llega acá aunque alguien cambie la consulta.
- **El chat pasa por el servidor del portal** (`/api/chat`), con el token de la
  sesión en `Authorization: Bearer`. La llave de la API del modelo y las cinco
  capas de defensa viven en el servidor: una llave dentro de la app la puede
  sacar cualquiera que la descargue.
- **La ubicación es simulada.** El usuario la elige de una lista; el botón «Usar
  mi ubicación real» solo sugiere la cabecera departamental más cercana,
  calculada en el teléfono (`src/lib/cercania.ts`): las coordenadas no salen de
  él. La personalización depende de la ubicación elegida, no del GPS.
- **El login es con Google por Supabase.** Se abre en el navegador del teléfono,
  Google le contesta a Supabase, y Supabase devuelve la sesión a la app por un
  enlace profundo. Google nunca ve la dirección `exp://` de Expo Go, que es lo
  que hace que funcione sin una cuenta de Apple.

## Correrla

```bash
cd app-movil
npm install
cp .env.example .env.local   # y completarlo
npx expo start
```

En el teléfono: instalar **Expo Go** (App Store / Play Store) y escanear el QR.

- El teléfono y la computadora en la **misma red**. Si la red de la universidad
  no deja que se vean, `npx expo start --tunnel`.
- Para el chat, el portal tiene que estar corriendo en la misma computadora
  (`npm run dev` en la raíz del repo): la app lo busca en el puerto 3000 de la
  máquina desde la que cargó. Con el portal desplegado, se pone su dirección en
  `EXPO_PUBLIC_API_URL`.
- Para revisarla en el navegador de la computadora: `npx expo start --web`.

## Configuración que hace falta una vez (para el login con Google)

1. **Google Cloud Console** → APIs y servicios → Credenciales → Crear ID de
   cliente OAuth → *Aplicación web*. En «URI de redireccionamiento autorizados»
   va la de Supabase: `https://<ref>.supabase.co/auth/v1/callback`.
2. **Supabase** → Authentication → Sign In / Providers → **Google**: habilitar y
   pegar el ID de cliente y el secreto del paso 1.
3. **Supabase** → Authentication → URL Configuration → **Redirect URLs**:
   agregar `exp://**` (Expo Go) y `noticiasverificadas://**` (la app con su
   propio ícono, si algún día se compila).

## Compartirla por un link

| | Con un link, sin Expo Go | Gratis |
|---|---|---|
| **Android** | Sí: un APK que se instala desde el link | Sí |
| **iPhone** | Solo con la cuenta de Apple Developer (USD 99 al año): TestFlight, o *ad hoc* registrando cada iPhone | No |

En iPhone, sin esa cuenta, el camino es Expo Go. Lo que hace falta en los dos
casos, antes de compartir un link:

- **El portal desplegado** y su dirección en `EXPO_PUBLIC_API_URL`. Con
  `npx expo start` la app busca el chat en la computadora; una app instalada no
  tiene computadora a la que preguntarle.
- En Supabase → URL Configuration → Redirect URLs, `noticiasverificadas://**`.

El APK de Android, con una cuenta gratuita de Expo:

```bash
cd app-movil
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:push preview --path .env.local
npx eas-cli@latest env:set preview --name EXPO_PUBLIC_API_URL --value https://<el-portal-desplegado> --visibility plaintext
npx eas-cli@latest build --profile preview --platform android
```

`env:push` hace falta porque `.env.local` no se sube a la compilación (está en
`.gitignore`). Lo que hay ahí es la URL de Supabase y la llave **publicable**:
ninguna llave secreta va dentro de la app. Al terminar, EAS da un link y un QR
para descargar el APK; Android pide permitir la instalación desde el navegador.

## Antes de la presentación

Expo Go del App Store solo abre proyectos de **su** versión de SDK. Si para la
fecha de la presentación Expo Go ya pasó a SDK 58, hay que actualizar el
proyecto (`npx expo install expo@^58 --fix`) y volver a probar. Conviene
revisarlo una semana antes.

## Comprobaciones

```bash
npx tsc --noEmit     # tipos
npx expo lint        # lint
npx expo-doctor      # compatibilidad con Expo Go y el SDK
```
