# Identidad visual de NEXO

NEXO conecta a las personas con la información. Eslogan: **Conecta con lo que pasa.**
Este cambio cubre presentación; conserva datos, permisos, autenticación, rutas y acciones.
El nombre de instalación, los identificadores técnicos, las claves y la configuración de producción no se modifican.

## Recursos y logotipo

Los recursos individuales suministrados se guardan intactos en `app-movil/assets/marca/` y se sirven al portal desde `public/marca/`:

- `nexo-horizontal.png`: logo principal negro/naranja, PNG con transparencia de 2172 × 724.
- `nexo-icono.png`: símbolo blanco sobre naranja, PNG de 1254 × 1254. Preparado como recurso visual; no sustituye los iconos de instalación ni modifica tiendas o splash nativo.

El favicon web utiliza una copia de este último archivo. El encabezado existente del artículo muestra el logo compacto; los botones y destinos de navegación se conservan.

No se incrustan las láminas, no se reconstruye la geometría y no se presenta ningún SVG como oficial.
`MarcaNexo`, en `app-movil/src/componentes/marca.tsx`, admite `horizontal`, `simbolo` e `icono`, tamaño y etiqueta accesible; los contratos `Logotipo` y `SelloMarca` se conservan.
La ventana de presentación descuenta los márgenes transparentes del original sin modificar el archivo ni estirar el dibujo.
La altura visual habitual es 30 y se reserva alrededor un espacio de un cuarto de esa altura.
La marca decorativa no se anuncia; el encabezado informa “NEXO”.

El modo claro usa el logo original. El modo oscuro y los fondos naranja usan una **variante monocroma blanca derivada de su canal alfa**, sin redibujar la forma ni invertir fotografías. `tono="monocromo"` o `tinta` permiten una reproducción de un solo color. La app utiliza `expo-image.tintColor`; el portal utiliza una máscara con el mismo PNG. No se han recibido archivos vectoriales ni una variante oscura bicolor individual: la monocroma blanca es la alternativa implementada.

Para incorporar un vector definitivo, sustituir la presentación encapsulada de `MarcaNexo` y el arte de `.nexo-logo` del portal, manteniendo sus contratos y espacio libre. No extraer el recurso definitivo desde la lámina.

## Color

Los temas se centralizan en `app-movil/src/constants/tema.ts`. El portal refleja estos valores en las variables de `src/app/globals.css`.

| Uso | Claro | Oscuro |
| --- | --- | --- |
| Marca | `#FF6B00` | `#FF6B00` |
| Texto sobre marca | `#111318` | `#111318` |
| Texto principal | `#111318` | `#F9FAFB` |
| Fondo | `#FFFFFF` | `#111318` |
| Superficie | `#F3F4F6` | `#1B1E24` |
| Texto secundario | `#5B616E` | `#B8BEC9` |
| Texto auxiliar | `#626A78` | `#A6AEBB` |
| Bordes decorativos | `#E5E7EB` | `#343A45` |
| Borde de campos | `#7D8592` | `#697587` |
| Enlaces y etiquetas pequeñas | `#B94600` | `#FF8A3D` |
| Acción primaria | `#C94F00` / blanco | `#FF6B00` / negro |
| Verificación | `#16803D` | `#86EFAC` |
| Error | `#B42318` | `#FDA29B` |

El naranja principal se reserva para identidad y selección. Los tonos funcionales oscuros mantienen legibles las categorías pequeñas; nunca se usa texto pequeño blanco sobre el naranja principal. Los sellos conservan texto e icono. El botón de Google conserva el recurso y tratamiento propios de Google.

## Tipografía

- Manrope 700: titulares, títulos de pantalla y artículo.
- Manrope 600: jerarquía secundaria.
- Inter 400: lectura, resúmenes e interfaz; cursiva 400 cuando ya se utiliza.
- Inter 600/700: controles, categorías y énfasis.
- Google Sans 500: exclusivamente el botón de acceso con Google.

Las fuentes son archivos TTF estáticos locales, con sus licencias SIL OFL en `app-movil/assets/fonts/`. Se usa el cargador existente `expo-font` y `next/font/local` con respaldo del sistema. No se requieren solicitudes a Google Fonts durante la lectura.
`Tipos` conserva sus nombres públicos. No se simulan pesos ni se desactiva el escalado del sistema.
Referencias móviles: apertura 26/33, tarjetas 18/24, título del artículo 29/36, resumen 15/23 y lectura de artículos 17/29. La composición limita el ancho de lectura a 720 y la portada a 1280.

## Espacio, temas y componentes

Escala: 4, 8, 12, 16, 20, 24, 32, 40 y 48. Márgenes móviles de portada: 20. Radios: 8, 12 y 16. Las noticias secundarias usan separadores y miniaturas; se evita encerrar cada nota en una tarjeta.

La composición móvil sigue las pantallas de la lámina: marca compacta, categorías en una fila horizontal siempre visible, fotografía de apertura y miniaturas a la izquierda de los titulares secundarios. Las categorías conservan sus opciones, conteos y filtro; se elimina únicamente el desplegable visual. La fecha y el título de portada comparten una línea discreta, y la explicación general del orden pasa al cierre. La verificación, la fuente y la razón de personalización siguen presentes en cada noticia.

Las noticias de portada sin imagen reservan el mismo espacio visual que las que sí tienen fotografía, mediante `ReservaDeImagen`: superficie neutra, símbolo NEXO y etiqueta “Sin imagen” en los formatos grandes. Las miniaturas muestran el símbolo y conservan la etiqueta accesible. Se reutilizan exactamente las dimensiones y radios de cada formato de foto (principal, rejilla o miniatura), en ambos temas. No se inventan fotografías ni se cambia la posición de las noticias en el ranking. En el artículo, la entradilla precede a la imagen y la firma conserva sus datos después de ella. El escritorio mantiene la rejilla y sus anchos propios. Las pestañas conservan sus destinos y permisos originales: no se añaden búsqueda, guardados o reacciones por aparecer en la referencia.

Se conserva el selector de apariencia y su persistencia. La interfaz usa el ancho disponible y el mecanismo `useDisposicion`, con navegación nativa en móvil y navegación web existente.

- `marca.tsx`: logo y símbolo accesibles.
- `portada-ancha.tsx`, `(tabs)/feed.tsx`: portada, principal, notas compactas y rejilla.
- `foto.tsx`, `apertura-tipografica.tsx`, `ilustracion.tsx`: fotografías reales y alternativa tipográfica existente.
- `dato-editorial.tsx`, `sello.tsx`: metadatos y estados de verificación.
- `carga-editorial.tsx`: skeleton estático, indicador y etiqueta accesible; se muestra con las condiciones de carga originales, sin demoras artificiales.
- `acceso-de-enlace.ts`: activación con Enter en web para los `Pressable` con rol de enlace; reutiliza su clic y callback existentes, sin cambiar destinos. En iOS y Android no añade eventos ni accede al DOM.
- `iconos.tsx`: familia Lucide existente, con licencia ISC.
- `redaccion/ui.tsx`: campos, botones y selectores existentes.
- `movimiento.ts`, `enlace-de-noticia.tsx`: microinteracciones con Reanimated 4.5.1.

Presión: 140 ms; estados: 160 ms; aparición: 220 ms. Se usan opacidad y transformaciones pequeñas, sin bucles decorativos. `ReduceMotion.System` conserva una interfaz operativa con movimiento reducido. El portal limita las transiciones CSS a `prefers-reduced-motion: no-preference`.

## Revisión

El informe y las capturas de la sesión se conservan en `/tmp/nexo-ui/`. Las compilaciones de Expo para iOS y Android son bundles y no equivalen a pruebas visuales en dispositivos. Las limitaciones de simuladores, lectores de pantalla y recortes deben declararse en la entrega; no se certifica una plataforma que no se haya ejecutado.

El ajuste posterior para acercar la composición a la lámina se documenta en `/tmp/nexo-referencia/`, con una copia de las fuentes anteriores al ajuste para revisar el alcance del cambio.
