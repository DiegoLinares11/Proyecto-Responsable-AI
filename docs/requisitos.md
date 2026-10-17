# Requerimientos, criterios de aceptación y Definition of Done

Fuente: *Proyecto 2: AI Assisted News App* (enunciado del curso, PDF). Este
documento traduce ese enunciado a requerimientos propios y verificables, que es
lo que el punto 8 de la presentación pide mostrar.

**Por qué existe ahora y no al principio.** Las Fases 0 a 7 se planificaron
sobre una descripción verbal del proyecto, sin el PDF. Al leerlo el 3 de octubre
aparecieron requisitos que el sistema no tenía —app móvil, Firebase Auth,
ubicación simulada, personalización por usuario, imagen para noticias sin
imagen—. Es el ejemplo más grande del proyecto de una evidencia cambiando el
plan, y se cuenta así en la presentación.

Estados: ✅ cumple · 🟡 parcial · ❌ falta.

---

## 1. Decisiones que fija el enunciado

| Decisión | Elegida | Por qué |
|---|---|---|
| App móvil en iPhone y Android, sin tiendas | **App nativa con Expo (React Native), probada en Expo Go** — `app-movil/` | Nativa de verdad y sin pagar: cada compañero instala Expo Go y escanea un QR. No hace falta la cuenta de Apple ($99) ni Mac. Se evaluó primero una PWA; se descartó porque el equipo prefiere que se sienta app, y el login con Google dejó de ser obstáculo al quedarse en Supabase (fila de abajo) |
| Autenticación | **Supabase Auth con Google**, en la app y en el portal | El enunciado dice Firebase; según el profesor, Supabase es aceptable (**confirmarlo por escrito**). Con Firebase, el login de Google no funciona dentro de Expo Go; con Supabase sí, porque Google le contesta a Supabase y Supabase devuelve la sesión a la app por un enlace profundo. Además conserva intacta la frontera de RLS |
| Chat | **Temporal**: el texto de las conversaciones no se guarda | El enunciado no exige historial. Guardarlo era una decisión de retención pendiente (informe, §8); no guardarlo la resuelve. Se conservan solo los metadatos de costo, que el tope de gasto necesita |
| Presupuesto | USD 20 en créditos de API, incluidos desarrollo y pruebas | **Pendiente de confirmar con el profesor**: las pruebas del chatbot y el red team corrieron con una suscripción personal (ADR 0005), no con créditos de API |

---

## 2. Requerimientos

### R-01 · App móvil en iPhone y Android — 🟡

`app-movil/`: Expo SDK 57 con pestañas nativas. Chat (inicial), Portada,
lectura de noticia con su ficha de validación, y Perfil. Lee las noticias
reales por Supabase y conversa por el servidor del portal. `expo-doctor` pasa
sus 21 comprobaciones. Para Android hay además un perfil de compilación que da
un APK instalable desde un link, gratis (`app-movil/eas.json`); en iPhone eso
exige la cuenta paga de Apple, así que ahí se usa Expo Go. **Falta: probarla en
un iPhone y un Android de verdad.**

**Criterios de aceptación**
- Abre en Expo Go en iPhone y en Android escaneando un QR; nadie necesita una
  tienda ni una cuenta de desarrollador.
- Pestañas nativas de cada sistema, no una imitación.
- Tres vistas: **chat** (inicial), **feed** y **lectura de noticia**, más el
  selector de ubicación.
- Usable con una mano: objetivos táctiles de 44 px como mínimo, teclado que no
  tapa la caja de texto del chat.

### R-02 · Login con Google — 🟡

El código de la app está listo (`app-movil/src/lib/sesion.tsx`); el servidor
del chat ya acepta el token de la app y lo valida contra Supabase (probado:
sin token 401, token inventado 401, token válido 200). Google ya está habilitado
en Supabase y el login de la app se probó con una cuenta real. El portal tiene
«Entrar con Google» con la misma cuenta (`src/app/entrar`, `src/app/auth/callback`),
probado hasta la pantalla de Google. **Falta: probar el portal de punta a punta**,
que necesita `http://localhost:3000/**` en las Redirect URLs de Supabase.

**Criterios de aceptación**
- La app y el portal inician sesión con Google.
- Las políticas de fila de Supabase siguen siendo la frontera: un usuario sin
  `noticias_publicar` no puede publicar aunque llame a la API a mano.
- El primer inicio de sesión crea el perfil como **lector**; nadie nace con
  privilegios (se conserva la regla de la Fase 1).

### R-03 · Ubicación simulada — ✅

Lista cerrada de 27 ubicaciones (`ubicaciones`), elegida desde la portada o el
perfil de la app. Con sesión vive en `preferencias_usuario`, que solo su dueño
lee —ni un moderador—; sin sesión, en el teléfono. Probado en la app: la misma
portada en la capital y en Quetzaltenango sale distinta. 13 aserciones en la
suite de RLS. El GPS es opcional y solo sugiere: el botón «Usar mi ubicación
real» elige la cabecera departamental más cercana, calculada en el teléfono
contra una tabla fija, sin geocodificación del sistema —que le manda las
coordenadas a Apple o a Google— y sin guardar las coordenadas. Fuera de
Guatemala no sugiere nada. **Falta probarlo en dos teléfonos a la vez.**

**Criterios de aceptación**
- El usuario elige una ubicación de una lista (departamentos de Guatemala y
  algunos países). No se usa el GPS ni se pide permiso de ubicación.
- La elección queda en su perfil y se puede cambiar en cualquier momento; el
  feed y el chat responden al cambio sin reiniciar la app.
- Dos teléfonos con ubicaciones distintas muestran feeds distintos para las
  mismas noticias publicadas (es la demostración del punto 4 de la presentación).

### R-04 · Chat como pantalla inicial, temporal — ✅

En la app es la pantalla inicial. Conoce la ubicación simulada: con el modelo
real, «¿qué está pasando en mi zona?» contestó con la nota de Quetzaltenango
desde Quetzaltenango y con la de Petén desde Petén, citando medio y fecha, y
diciendo cuando no había más.

**El texto no se guarda** (16 de octubre de 2026). La conversación vive en la
pantalla y desaparece al cerrarla; el servidor nunca le pasó el historial al
modelo, así que guardarlo no servía para conversar. La base ni siquiera tiene
la columna: la quitó la migración `20261016120100_chat_temporal.sql`, con el
texto de los turnos anteriores, y la sección 17 de la suite de RLS lo
comprueba. Quedan los metadatos que necesitan los topes (rol, fecha, modelo,
tokens, costo). El motivo de un bloqueo de la capa 1 se guarda sin el
razonamiento del clasificador, que parafraseaba lo que escribió la persona. 7
pruebas en `tests/unit/chatbot/chat-temporal.test.ts`. Distinguir lo que está
en desarrollo es de R-13.

**Criterios de aceptación**
- Es lo primero que se ve al abrir la app.
- Responde, con las noticias publicadas: un resumen de lo reciente; lo relevante
  para la **región simulada** del usuario; noticias de otro país o región; temas
  presentes en las noticias.
- Cada respuesta deja reconocer sus fuentes —el medio y la noticia— y distingue
  lo **confirmado** de lo **no confirmado o en desarrollo** (R-13).
- Al cerrar la sesión, la conversación desaparece; en la base no queda el texto.
- Las 8 comprobaciones de la capa 3 y el red team siguen pasando.

### R-05 · Feed personalizado con jerarquía visual — ✅

Tres tamaños de tarjeta en la app, ordenados por relevancia personal, y una
línea por noticia que dice por qué está ahí («De tu zona · Quetzaltenango»,
«Para que no te pierdas lo nacional»). En una pantalla ancha (la web, una
tableta) la portada se arma como un diario en línea: la principal grande, cuatro
destacadas en rejilla a su lado y el resto en columnas. Es la única portada: el
servidor de Next es el backend, no una segunda portada con otro orden.

**Criterios de aceptación**
- El orden, el tamaño y la posición dependen del usuario: su ubicación y sus
  intereses (R-06), además de la relevancia global de la Fase 3.
- No es una lista indiferenciada: al menos tres tamaños de tarjeta según la
  relevancia estimada.
- Cada noticia sigue explicando «¿por qué está aquí?», ahora con los factores
  personales (por ejemplo, «tu ubicación ×1.6»).

### R-06 · Intereses inferidos del comportamiento — ✅

Las noticias que el usuario abrió en 30 días, por sección, con un factor entre
0.8 y 1.4. El perfil los muestra con su factor y deja reiniciarlos; reiniciar
mueve una fecha y no borra lecturas, que también alimentan el ranking global.
Solo cuentan las aperturas, no las reacciones: es lo único que la app registra
hoy.

**Criterios de aceptación**
- La señal son las noticias que el propio usuario abrió, por sección. La app
  todavía no tiene reacciones; cuando las tenga, se pueden sumar. **No se usan
  las conversaciones del chat** (son temporales y privadas).
- El efecto está acotado: un interés puede subir o bajar una noticia, nunca
  hacerla desaparecer.
- El usuario ve qué intereses le infirió el sistema y los puede reiniciar.

### R-07 · La personalización no oculta lo que hay que saber — ✅

Los cupos de cobertura, con 19 pruebas en `tests/unit/personalizacion/`. Con los
cupos desactivados, las tres pruebas de cobertura fallan. La segunda viñeta
cambió con los datos reales: lo más importante del día se elige entre lo
nacional e internacional (ver §3).

**Criterios de aceptación**
- Entre las primeras posiciones del feed hay siempre al menos una noticia
  **local** (de su región), una **nacional** y una **internacional**, si existen,
  sin importar sus intereses.
- La noticia nacional o internacional de mayor relevancia global aparece entre
  las tres primeras para todos los usuarios. Una local, aunque sea la más
  fresca, es importante para su zona, no para todos.
- Una prueba unitaria lo comprueba con un usuario de intereses extremos: solo
  lee deportes y su ubicación es de otro país.

### R-08 · Vista de lectura con procedencia — ✅

Existe: medio, fecha, enlace al original, crédito de la imagen y el desglose de
las cinco señales de validación.

**Criterio pendiente**: que se vea bien dentro de la PWA (R-01).

### R-09 · Portal administrativo autenticado — ✅

El formulario de publicar ya registra el alcance y la zona o el país, con la
misma regla que impone la base.

**La redacción vive en la app**, en una pestaña que aparece solo si el rol de la
cuenta tiene algún permiso de la redacción (`noticias_publicar`,
`noticias_moderar` o `usuarios_administrar`), con una sección por permiso:
Publicar, Moderación y Cuentas. La app no escribe directo: llama a
`/api/redaccion/*` con el token de la sesión, y el servidor vuelve a comprobar
el permiso en cada petición (401 sin sesión, 403 sin permiso) antes de que lo
compruebe la política de fila. Las páginas `/publicar`, `/moderacion` y
`/administracion` del servidor siguen como respaldo, con la misma
implementación (`src/modules/redaccion`): 22 pruebas en
`tests/unit/redaccion/` confirman que un formulario del portal y un JSON de la
app se rechazan igual.

Se entra con Google con la misma cuenta en los dos lados. Una cuenta con
`usuarios_administrar` hace publicador o moderador a quien entró como lector, con
un motivo que queda en `auditoria` junto con quién lo hizo; abajo se ve el
historial. El permiso se comprueba con la sesión y la escritura va por el
servidor, porque desde una sesión el trigger `impedir_autoascenso` lo rechaza.
Nadie cambia su propio rol, y un administrador se nombra o se quita solo en el
servidor (`scripts/asignar_rol.mjs`): con una sesión robada no se toma el
sistema. 8 pruebas de esas reglas en `tests/unit/usuarios/`.

**Criterios de aceptación**
- Entrada con Firebase (R-02).
- Al crear una noticia se registra su **alcance geográfico** (local, nacional o
  internacional) y su **región**, además de la sección, la procedencia y la
  imagen.
- **Publica una persona.** El canal de validación recomienda y explica; el botón
  de publicar lo aprieta alguien con permiso. Cumplido el 16 de octubre de
  2026: lo que pasa de 75 queda en revisión con «El canal recomienda
  publicarla» en la cola (app y portal), y lo publica un moderador. Ningún
  veredicto del canal lleva a `verificada` (`ESTADO_POR_VEREDICTO`, con sus
  pruebas en `tests/unit/noticias/recomendacion.test.ts`).

### R-10 · Imagen para una noticia sin imagen — 🟡

Hecho, salvo la prueba de punta a punta con sesión:

- **La base guarda el origen** de cada imagen (`origen_imagen`: medio, licencia
  libre, ilustración o generada por IA) y la página de su licencia
  (`url_fuente_imagen`). Las reglas viven en CHECK: una foto sin origen no
  entra, la ilustración no tiene archivo, una licencia libre sin enlace a su
  fuente no entra. Seis aserciones en la sección 16 de la suite de RLS, que
  además encontraron un error de la primera versión: con el origen nulo, el
  CHECK daba NULL y dejaba pasar la foto.
- **Al publicar, la app (y el portal) ofrecen tres caminos**: la ilustración tipográfica
  (por defecto: es la única que nunca pasa por foto), una foto de archivo de
  Wikimedia Commons, o la foto del medio. De Commons solo pasan CC0, dominio
  público, CC BY y CC BY-SA, y el crédito («autor · licencia · Wikimedia
  Commons») lo arma el servidor: al guardar vuelve a consultar el archivo, así
  que el formulario dice cuál foto, pero no de quién es ni con qué licencia.
  12 pruebas en `tests/unit/imagenes/`.
- **La interfaz lo muestra siempre**, en el portal y en la app: «Foto del medio»,
  «Foto de archivo · no es del hecho» (casi nunca lo es: la de «incendio
  forestal» suele ser de otro incendio), «Generada por IA · no es una
  fotografía» encima de la imagen, y la ilustración con su etiqueta. En las
  miniaturas de la app, una marca «ARCHIVO» o «IA».
- Nadie genera imágenes con IA: la categoría existe para que, si se usa, la base
  la distinga y la interfaz la rotule.

**Falta: publicar una noticia desde el formulario con una cuenta de
publicador.** La búsqueda y la verificación contra Commons se probaron con red,
pero no dentro del formulario con sesión.

**Criterios de aceptación**
- Si la noticia no trae imagen, el portal ofrece, dentro del mismo flujo:
  1. **Buscar una imagen con licencia libre** (Wikimedia Commons), con su autor y
     su licencia guardados en el crédito.
  2. **Generar una ilustración** que no pueda confundirse con una fotografía: una
     composición tipográfica con la sección y el titular, sin IA y sin costo.
- Si en algún momento se usa IA para generar una imagen, se marca en la base y
  se muestra sobre la imagen: «Ilustración generada por IA — no es una fotografía
  del hecho».
- La base distingue el **origen** de cada imagen: fotografía del medio, licencia
  libre, ilustración o generada por IA. La interfaz lo muestra siempre.

### R-11 · Costos visibles — 🟡

El tope de gasto se cumple en la capa 0 (`vista_gasto_api`).

**Criterios de aceptación**
- El portal muestra el gasto acumulado, el saldo (USD 20 menos el gasto), el
  costo promedio por función —clasificador y respuesta— y el crédito reservado
  para la demostración.
- Lo que se muestra sale de la misma vista que usa el tope: un solo número de
  verdad.

### R-12 · Validación contra la desinformación — ✅

Cinco señales deterministas, umbrales, cola de moderación, red team, alertas de
contenido envenenado (Fases 2, 5 y posteriores).

### R-13 · Lo no confirmado se comunica como tal — 🟡

**Criterios de aceptación**
- Una noticia puede publicarse como **en desarrollo**, con una etiqueta visible
  en el feed, en la lectura y en el chat. Solo la publica así una persona, con
  motivo escrito.
- El chat no presenta como confirmado nada que esté en desarrollo, y lo dice.
- Cuando el sistema no puede confirmar algo, lo dice con esas palabras, no con un
  puntaje que haya que interpretar.

### R-14 · Transparencia en la interfaz — 🟡

En la app, la identidad lo separa a la vista: lo que dice el medio va en
Newsreader, lo que ordena y explica la plataforma en Public Sans, los números
de la verificación en IBM Plex Mono, y lo que escribe la IA en cursiva con la
etiqueta «IA». La ficha de verificación dice en naranja lo que no se pudo
comprobar —por ejemplo, desmentidos sin verificador configurado— en vez de
mostrar solo lo que salió bien. Y la lectura de cada noticia dice por qué está
en tu portada, con los números: los cuatro componentes de la relevancia global,
tu factor de ubicación, tu factor de interés y el resultado.

**Criterios de aceptación**
- Lo que escribió el medio, lo que resumió el sistema y lo que generó la IA se
  distinguen a la vista. Las respuestas del chat llevan una marca de «respuesta
  generada por IA».
- Cada pregunta de transparencia del enunciado (importancia, fuentes, validación,
  límites de la IA, imágenes) tiene una respuesta en la app o en el portal, no
  solo en este documento.

---

## 3. Diseño de la personalización (R-03, R-05, R-06, R-07)

Sin tokens, como el resto del ranking: ordenar y presentar se resuelve sin IA,
que es lo que pide el enunciado sobre llamadas costosas.

```
relevancia_personal = relevancia_global (Fase 3)
                    × factor_geografico(alcance, región de la noticia, ubicación del usuario)
                    × factor_de_interes(sección, historial del usuario)
```

| Factor | Valores propuestos | Límite |
|---|---|---|
| Geográfico | local de su región ×1.6 · nacional de su país ×1.2 · internacional ×1.0 · local de otra región **×0.2** | Fijo y publicado |
| Interés | entre ×0.8 y ×1.4, según la proporción de lecturas por sección en los últimos 30 días, suavizada | No puede bajar de ×0.8: el interés reordena, no esconde |

Después del orden, los **cupos de cobertura** (R-07) se garantizan
reacomodando, no filtrando.

**Lo que cambiaron los datos reales.** La propuesta decía ×0.6 para lo local de
otra región. Con las noticias del 3 de octubre, a alguien en la capital las
cuatro primeras le salían locales de OTROS departamentos: tenían 3 a 6 horas
contra 14 a 22 de lo internacional, y la frescura multiplica la relevancia
global casi ×4 en un mismo día. Es el sesgo del decaimiento que el informe ya
documentaba (§6), ahora pasándole por encima a la geografía. Se bajó a ×0.2. Y
«lo más importante del día» se elegía entre todo, así que salía una nota de un
centro de salud de Quetzaltenango, metida entre las tres primeras también para
alguien en México. Las dos correcciones tienen pruebas escritas con esos
números, que fallaban antes del arreglo.

Los factores siguen siendo una decisión del equipo que hay que poder defender:
el enunciado lo pide.

---

## 4. Definition of Done

Una tarea está terminada cuando se cumplen todas estas condiciones:

1. Cumple sus criterios de aceptación, y cada uno se puede **mostrar**, no solo
   afirmar.
2. Tiene pruebas: unitarias para la lógica, y aserciones en la suite de RLS si
   toca permisos. Las pruebas existentes siguen pasando (`npm test`,
   `npm run test:rls`, `npm run typecheck`, `next build`).
3. Si toca el chatbot, el red team de la categoría afectada se corrió con
   repeticiones y el resultado quedó en `docs/red-team.md`, incluido lo que salió
   mal.
4. Se vio funcionando en la app real: escritorio y 375 px.
5. Si cambia una decisión, quedó escrita (ADR, o la sección del documento que
   corresponde). **Ninguna afirmación sobre un control puede quedar en un
   documento, una pantalla o una respuesta del chatbot sin una prueba que la
   compruebe**: es la lección de las cuatro veces que el sistema afirmó controles
   que no tenía (informe, §9).
6. El commit explica el porqué, en Conventional Commits.

---

## 5. Preguntas para el profesor

1. El enunciado pide **Firebase Authentication**. ¿Es aceptable Supabase Auth con
   Google? (El equipo entiende que sí; conviene tenerlo por escrito.)
2. El presupuesto de USD 20 «incluye desarrollo y pruebas». Las pruebas del
   chatbot corrieron con una suscripción personal de Claude, no con créditos de
   API. ¿Es aceptable si se declara, o hay que repetirlas con créditos?
