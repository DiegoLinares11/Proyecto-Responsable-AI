# Validación de veracidad

Ninguna noticia se muestra por el solo hecho de que alguien con permiso la
subió. Pasa por cinco señales independientes, todas gratuitas y todas
deterministas.

## Por qué sin modelo

La tentación es pedirle a Claude «¿esta noticia es verdadera?». Tres razones
para no hacerlo:

1. **No lo sabe.** El modelo no tiene acceso a los hechos de hoy; tiene un
   corte de entrenamiento. Preguntarle por una noticia de esta mañana es pedirle
   que adivine con seguridad.
2. **No se puede auditar.** «El modelo dijo que sí» no es una justificación que
   se le pueda dar a un usuario, ni una que aguante en el informe del curso.
3. **Cuesta.** Y el presupuesto está comprometido con el chatbot.

Las cinco señales, en cambio, son verificables por cualquiera que repita el
procedimiento.

## Las cinco señales

### 1. Credibilidad de la fuente

El dominio se busca en el registro `fuentes`, que guarda para cada medio un
`puntaje_credibilidad` (0–100), un `nivel` (agencia internacional, medio
nacional establecido, medio digital, blog, desconocido) y **la justificación
escrita** de por qué tiene ese puntaje.

Un dominio que no está en el registro no se rechaza: entra como desconocido con
puntaje bajo y va a moderación. Es la diferencia entre un sistema que censura y
uno que pide una segunda mirada.

> **Sesgo declarado.** Este registro lo arma el equipo a mano. Es una posición
> editorial, no un hecho. El informe de la Fase 7 tiene que decir quién lo
> curó, con qué criterio, y qué pasa con medios locales guatemaltecos que no
> aparecen en los índices internacionales de credibilidad — que es exactamente
> el punto ciego que un sistema así tiende a tener.

### 2. La URL existe y dice lo que dice

Se descarga la página, se comprueba que responde 200, y se leen sus metadatos
Open Graph: `og:title`, `og:description`, `article:published_time`. Luego se
compara el titular publicado contra el titular real con similitud difusa.

Atrapa dos cosas: enlaces inventados y noticias donde el titular que se subió
exagera o tergiversa lo que el artículo original dice.

> **El canal que valida no puede ser el agujero.** Esta señal descarga una URL
> que escribió el publicador, y eso convierte al servidor en un cliente HTTP a
> las órdenes de un usuario — un SSRF de manual. Alguien con permiso de publicar
> podría enviar `url_original` apuntando a `http://169.254.169.254/` (los
> metadatos de la nube, donde viven credenciales) o a un servicio interno.
>
> Tres defensas, en `src/modules/validacion/red-segura.ts`: solo `http` y
> `https`; se resuelve el nombre y se comprueba que **ninguna** de sus
> direcciones sea privada (revisar solo el texto del host no sirve, porque un
> atacante registra un dominio público que resuelve a `127.0.0.1`); y los
> redireccionamientos se siguen a mano revisando cada salto, porque un destino
> público que redirige a uno privado es el bypass clásico.
>
> En este proyecto el publicador es alguien de confianza, pero «de confianza» no
> es un control de seguridad: basta una cuenta comprometida.

### 3. Corroboración independiente

Se extraen las entidades y palabras clave del titular y se consulta **GDELT**
(gratuita, sin llave, cobertura mundial) buscando el mismo hecho en una ventana
de tiempo cercana. Se cuentan cuántos **dominios distintos** lo cubren.

La regla es de sentido común periodístico: dos o más medios independientes de
buen nivel cubriendo lo mismo es una señal fuerte; un solo medio de nivel bajo
y nadie más, es una señal para dudar.

El conteo es por dominio, no por artículo, para que veinte réplicas de un mismo
cable no cuenten como veinte confirmaciones. El dominio de la propia noticia
tampoco cuenta: un medio no se corrobora a sí mismo, y sin esa regla cualquier
nota tendría una confirmación gratis.

> **Medido contra el servicio real, y conviene saberlo antes de perder una
> tarde.** GDELT tiene dos comportamientos que no se ven con pruebas dobles:
>
> 1. **Su saludo TLS tarda entre 10 y 12 segundos.** El `fetch` de Node aborta
>    la conexión a los 10 y ese límite no se puede subir sin agregar una
>    dependencia, así que la señal fallaba siempre con
>    `UND_ERR_CONNECT_TIMEOUT`. Se resolvió con un cliente propio sobre
>    `node:https` (`src/modules/validacion/http-tolerante.ts`). Para comparar:
>    el TLS de Prensa Libre, Supabase y GitHub desde la misma máquina tarda
>    entre 0.10 y 0.23 segundos.
>
> 2. **Limita por dirección IP, no por usuario.** Devuelve 429 incluso con 25
>    segundos entre consultas cuando se le llama desde detrás de una NAT
>    compartida —una oficina, un campus—, porque el cupo lo consume todo el
>    edificio. Desde otra red, o ya desplegado, funciona.
>
> Por eso el puerto acepta **varios proveedores encadenados**
> (`crearBuscadorEnCadena`): se prueban en orden y gana el primero que
> conteste. Cero artículos no hace saltar al siguiente, porque cero es una
> respuesta —nadie más cubre el hecho— y no un fallo.
>
> **Decisión pendiente del equipo:** falta elegir el segundo proveedor. Google
> News RSS funciona muy bien desde Guatemala (probado: 100 resultados, 19
> dominios, con Prensa Libre, Soy502, Emisoras Unidas y el Diario de Centro
> América entre ellos), pero su propio feed declara que el uso está limitado a
> lectores personales no comerciales. Usarlo como servicio de respaldo en una
> aplicación va contra eso, y en un proyecto de IA responsable esa es
> precisamente la clase de atajo que no se toma en silencio. La alternativa
> limpia es consultar los feeds RSS que cada medio del registro publica para
> ser sindicado — menos cobertura, permiso explícito. Queda para el informe.

### 4. Desmentidos conocidos

Se consulta la **Google Fact Check Tools API** (gratuita) con las mismas
palabras clave. Si la afirmación coincide con algo ya verificado como falso por
una organización de fact-checking, la noticia se marca `desmentida` y se detiene
ahí. Ninguna otra señal la rescata.

### 5. Coherencia interna

Comprobaciones baratas sobre el contenido mismo: que la fecha sea plausible (ni
futura ni de hace años presentada como de hoy), que el titular no contradiga al
cuerpo, que no haya restos de plantilla ni marcadores obvios de texto generado.

## Cómo se combinan

Cada señal aporta a un `puntaje_veracidad` de 0 a 100 y **queda guardada por
separado**. Nunca se muestra el puntaje sin su desglose. Un usuario que pregunta
por qué una noticia está marcada como no verificable ve la lista de señales, no
un número suelto.

| Puntaje | Estado | Qué pasa |
|---|---|---|
| ≥ 75 | `verificada` | Se publica y entra al ranking con peso completo |
| 45–74 | `en_revision` | Va a la cola de moderación humana |
| < 45 | `no_verificable` | No se publica; el autor ve el desglose y puede corregir |
| cualquiera | `desmentida` | Bloqueada por la señal 4, sin importar el resto |

Los máximos por señal suman 100: credibilidad 30, URL 20, corroboración 30,
coherencia 20. El desmentido no aporta puntos porque **es un veto**: una nota
que un verificador ya desmintió no se arregla teniendo buena fuente y buena
redacción. Si se le restaran puntos, una noticia falsa de un medio con
credibilidad 90 y tres agregadores replicándola podría seguir pasando el umbral.

Dos consecuencias de esa aritmética que vale hacer explícitas, porque se cumplen
sin necesidad de un `if` que alguien pueda borrar:

- **Una noticia sin URL nunca llega a `verificada`.** Credibilidad y URL suman
  50 de los 100 puntos, así que el tope alcanzable queda por debajo del umbral.
- **Una señal indisponible impide la publicación automática**, por alto que sea
  el puntaje. No se da por corroborada una noticia por falta de datos.

## La regla que no se negocia

**Nada por debajo del umbral se publica automáticamente.** Los pesos se pueden
discutir, los umbrales se pueden calibrar, pero el sistema nunca publica solo
algo de lo que no está seguro. Un moderador que espera es un costo; una noticia
falsa publicada con el sello de «verificada» es el daño que este proyecto
existe para evitar.

Y en la otra dirección: el sistema tampoco borra. Marca, explica y escala a una
persona. La decisión editorial la toma un humano.

## Falsos positivos

Un medio guatemalteco pequeño pero legítimo, que ningún índice internacional
lista y que GDELT no indexa, va a puntuar bajo. Esto no es un error de
implementación, es una consecuencia del método, y hay que tratarlo como tal:

- La cola de moderación existe precisamente para eso.
- Cuando un moderador aprueba una fuente desconocida, esa decisión sube el
  puntaje del dominio en el registro. El sistema aprende de la corrección
  humana, no del modelo.
- El informe reporta cuántas noticias legítimas cayeron en moderación. Es una
  métrica del proyecto, no un detalle a esconder.
