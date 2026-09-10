# Ranking de relevancia

El feed se ordena de mayor a menor relevancia con una fórmula, no con un
modelo. Se puede leer, se puede discutir y se puede recalcular a mano.

## La fórmula

```
puntaje_base =
      w_interaccion  · log(1 + interacciones_ponderadas)
    + w_verificadas  · log(1 + reacciones_de_verificadas_ponderadas)
    + w_fuente       · (credibilidad_fuente / 100)
    + w_veracidad    · (puntaje_veracidad   / 100)
    - penalizacion_estado

relevancia = puntaje_base / (horas_desde_publicacion + 2) ^ gravedad
```

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

Las noticias `en_revision` entran al feed con penalización fuerte, o no entran,
según se configure. Las `no_verificable` y `desmentida` no entran.

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

Los pesos iniciales son una hipótesis:

| Peso | Valor inicial |
|---|---|
| `w_interaccion` | 1.0 |
| `w_verificadas` | 1.5 |
| `w_fuente` | 20.0 |
| `w_veracidad` | 25.0 |
| `gravedad` | 1.5 |

Se ajustan con datos sembrados y casos de prueba escritos como aserciones: «una
noticia verificada de fuente fuerte con tracción moderada debe quedar por
encima de una viral sin corroborar». Esas aserciones son la prueba de regresión
del ranking; si un cambio de pesos las rompe, el cambio está mal.
