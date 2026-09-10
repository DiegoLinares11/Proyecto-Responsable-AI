# ADR 0003 — El ranking es una fórmula publicada

**Estado:** aceptada · **Fecha:** 2026-09-10

## Contexto

El feed se ordena de mayor a menor relevancia, combinando interacciones dentro
de la plataforma, reacciones de cuentas verificadas y la fuerza de la fuente.
Se podía resolver con un modelo que ordenara, o con una fórmula.

## Decisión

Una fórmula determinista con pesos guardados en base de datos, cada componente
almacenado por separado y el desglose visible al usuario.

## Por qué

**Un ordenamiento que no se puede explicar es lo que este curso enseña a no
construir.** Los sistemas de recomendación opacos son el ejemplo de manual de
daño algorítmico. Hacer uno opaco en un proyecto de IA responsable sería
contradecir el tema del trabajo.

**Se puede probar.** «Una noticia verificada de fuente fuerte con tracción
moderada debe quedar por encima de una viral sin corroborar» es una aserción
que corre en la suite de pruebas. Un ordenamiento por modelo no se prueba así.

**Cuesta $0** y corre en milisegundos dentro de una consulta SQL.

## Consecuencias

- La fórmula es pública, y por lo tanto atacable. Hace falta el conjunto de
  defensas del documento de ranking: tope por usuario, peso por antigüedad de
  cuenta, detección de ráfagas. La transparencia tiene ese costo y se paga a
  propósito.
- Los pesos son una hipótesis que hay que calibrar con datos sembrados.
- El sistema no entiende de qué trata una noticia; solo mide señales a su
  alrededor. No hay diversidad temática ni personalización, y eso está bien
  para el alcance — pero hay que decir en el informe que un feed así puede
  concentrar la atención en un solo tema del día.
- Otorgar verificación y autoridad es poder editorial. Se declara y se
  justifica.
