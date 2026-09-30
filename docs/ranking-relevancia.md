# Ranking de relevancia

El feed se ordena de mayor a menor relevancia con una fórmula, no con un
modelo. Se puede leer, se puede discutir y se puede recalcular a mano.

## La fórmula

```
puntaje_base =
      w_interaccion  · ln(1 + interacciones_ponderadas)
    + w_verificadas  · ln(1 + reacciones_de_verificadas_ponderadas)
    + w_fuente       · (credibilidad_fuente / 100)
    + w_veracidad    · (puntaje_veracidad   / 100)²
    - penalizacion_estado

relevancia = puntaje_base / (horas_desde_publicacion + 2) ^ gravedad
```

La veracidad entra **al cuadrado**, y esa exponente no estaba en el diseño
original: apareció al calibrar. En lineal, una noticia que raspó el umbral con
76 se llevaba 19 de los 25 puntos —el 76% de lo que vale estar sólidamente
corroborado con 92, que se llevaba 23— y con cuatro puntos de diferencia el
término dejaba de distinguir «apenas aceptable» de «bien sustentado». Al
cuadrado, 76 vale 14.4 y 92 vale 21.2.

La credibilidad de la fuente se deja lineal a propósito. Es un juicio curado en
escalas gruesas (agencia internacional, medio nacional, medio digital), no una
medición sobre un umbral, y elevarla al cuadrado castigaría de más a los medios
intermedios legítimos — que es justo el punto ciego que el registro ya tiene.

El divisor es el ranking de Hacker News: sin él, la noticia más vieja con más
acumulado se queda arriba para siempre y el feed deja de ser un feed. `gravedad`
arranca en 1.5 y se calibra con datos reales.

## Los cuatro términos

### Interacciones dentro de la plataforma

Reacciones, comentarios y lecturas completas, con pesos distintos porque no
cuestan lo mismo: leer es barato, reaccionar cuesta un clic, comentar cuesta
escribir.

El logaritmo es deliberado. Sin él, una noticia con 1,000 reacciones aplasta a
una con 100 aunque no sea diez veces más relevante. Con él, cada interacción
adicional aporta menos que la anterior, que es como funciona la atención de
verdad.

### Reacciones de cuentas verificadas

Requisito explícito del proyecto: **que una fuente pese más que otra**. Cada
cuenta verificada tiene una `autoridad` de 0 a 100, y su reacción entra
multiplicada por ella. La reacción de un medio nacional acreditado mueve la
aguja más que la de una cuenta recién creada, y eso está guardado como número,
no como intuición.

> **Sesgo declarado.** Quién es verificado y con cuánta autoridad lo decide el
> equipo. Es poder editorial. El informe tiene que decir con qué criterio se
> reparte y qué pasaría si se reparte mal — un ranking que amplifica a quien ya
> tiene voz es un resultado conocido de este tipo de fórmula, no una sorpresa.

### Credibilidad de la fuente y puntaje de veracidad

Los dos vienen de la Fase 2. Entran normalizados a 0–1. Que una noticia bien
corroborada suba por encima de una apenas corroborada con la misma tracción es
el comportamiento buscado: la plataforma premia estar bien sustentado, no solo
ser popular.

### Penalización por estado

**Solo entran al feed las `verificada`.** Este documento dejaba la puerta
abierta a que las `en_revision` entraran con penalización fuerte, y al
implementar apareció la razón para cerrarla.

El esquema de la Fase 1 tiene una restricción —`noticias_publicada_tiene_fecha`—
que solo permite `publicada_en` a las noticias verificadas. Sin fecha de
publicación no hay antigüedad que medir, y sin antigüedad no hay decaimiento:
una noticia en revisión se quedaría en el feed sin envejecer nunca.

Se podía relajar la restricción o usar `creado_en` como sustituto, pero la base
tenía razón y el ranking no: **mostrar en el feed público una noticia que el
canal de validación no dio por buena es publicarla**, penalizada o no. Y la
regla que no se negocia del proyecto es que nada por debajo del umbral se
publica solo. Las noticias en revisión aparecen en la cola de moderación, que es
donde tienen que estar.

## Transparencia

Cada componente se guarda por separado en la fila de la noticia. La interfaz
muestra un «¿por qué está aquí?» con el desglose:

```
Relevancia 84.2
  Interacciones en la plataforma      +31.0   (412 reacciones, 87 comentarios)
  Reacciones de cuentas verificadas   +28.4   (3 cuentas, autoridad promedio 82)
  Credibilidad de la fuente           +18.0   (Prensa Libre, 90/100)
  Veracidad                           +19.5   (corroborada por 4 medios)
  Antigüedad                          ×0.71   (6 horas)
```

Esto no es un adorno. Un sistema de recomendación que no puede explicar su
salida es exactamente lo que un curso de IA responsable enseña a no construir.

## Defensas contra manipulación

La fórmula publicada es una fórmula atacable. Cuatro medidas:

**Tope por usuario.** Una persona aporta como máximo una vez por noticia y por
tipo de interacción. Recargar la página cien veces no suma cien lecturas.

**Peso por antigüedad de la cuenta.** Las cuentas recién creadas aportan
fracción de peso durante sus primeros días. Sube el costo de armar una granja
de cuentas.

**Detección de ráfagas.** Si una noticia recibe un pico anómalo de
interacciones desde cuentas creadas en la misma ventana o con patrón temporal
sospechoso, el aporte se congela y la noticia va a revisión. No se borra nada:
se marca y lo ve una persona.

**Los pesos son configuración, no constantes.** Viven en una tabla, con
historial de cambios. Cuando se ajusta un peso queda registro de quién y por
qué — es una decisión editorial y se trata como tal.

## Calibración

| Peso | Inicial | Vigente | Por qué cambió |
|---|---|---|---|
| `w_interaccion` | 1.0 | 1.0 | — |
| `w_verificadas` | 1.5 | 1.5 | — |
| `w_fuente` | 20.0 | 20.0 | — |
| `w_veracidad` | 25.0 | 25.0 | — |
| `gravedad` | 1.5 | **1.2** | Ver abajo |

Se ajustan con datos sembrados y casos de prueba escritos como aserciones: «una
noticia verificada de fuente fuerte con tracción moderada debe quedar por encima
de una viral sin corroborar». Esas aserciones son la prueba de regresión del
ranking; si un cambio de pesos las rompe, el cambio está mal.

### La primera calibración, y lo que enseñó

Con los pesos iniciales, el feed sembrado salía **al revés** de lo que este
documento promete. Medido con `scripts/mostrar_feed.mjs` sobre los datos de
`scripts/sembrar_demo.sql`:

| Noticia | Puntaje base | Antigüedad | Relevancia |
|---|---|---|---|
| Fuente registrada 75, veracidad 92 | 43.42 | 6 h | 1.919 |
| Fuente desconocida, veracidad 76 | 24.05 | 3 h | **2.151** |

La de fuente desconocida quedaba primera. Dos causas que se suman:

1. **Con `gravedad` 1.5, tres horas de diferencia valen un factor de 2×.** El
   término de antigüedad se mueve en órdenes de magnitud mientras que los de
   calidad están acotados en 45 puntos, así que la frescura le gana siempre a
   estar bien sustentado.
2. **La veracidad entraba lineal**, así que raspar el umbral valía el 76% de lo
   que vale estar sólidamente corroborado.

Con `gravedad` 1.2 y la veracidad al cuadrado, la bien sustentada gana por 21% —
margen suficiente para que la aserción de regresión no sea frágil.

El cambio de peso está registrado en `pesos_ranking` con su motivo, que era
exactamente para esto: la fila anterior quedó cerrada con su fecha y la nueva
explica la medición. Y la calibración vive en `tests/unit/ranking/` con los
perfiles reales, así que si alguien sube la gravedad o vuelve la veracidad a
lineal, falla una prueba en vez de degradar el feed en silencio.

> Queda anotado para el informe que el decaimiento sigue siendo el término
> dominante dentro de las primeras horas. Eso es normal en un feed de noticias,
> pero significa que la promesa «la plataforma premia estar bien sustentado»
> tiene un alcance acotado: aplica entre noticias de antigüedad comparable, no
> contra una nota recién publicada. Subir más los pesos de calidad o bajar más
> la gravedad lo corregiría, al precio de que el feed se sienta estancado.
