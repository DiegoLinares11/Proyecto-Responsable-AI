# ADR 0006 — El feed se lee sin cuenta

**Estado:** aceptada · **Fecha:** 2026-10-02 · **Revierte parte de:** Fase 1

## Contexto

La Fase 1 decidió que esta plataforma no tenía lectura anónima: todas las
políticas de fila se escribieron `to authenticated` y `anon` no recibió ningún
privilegio. En su momento parecía la opción conservadora.

Al construir la interfaz quedó claro que tenía dos problemas.

**El de producto.** Es una plataforma de *noticias publicadas*. Exigir cuenta
para leer una noticia que el sistema ya declaró pública no protege nada y
contradice el propósito del proyecto.

**El técnico, que es el grave.** Sin lectura anónima, la interfaz tenía que leer
el feed con la llave de servicio —que se salta todas las políticas— porque la
alternativa era una pantalla vacía. Eso dejaba al proyecto en la peor posición
posible: **la capa de control de accesos existía, estaba probada con 38
aserciones, y la aplicación no la usaba.** El filtro `estado = 'verificada'` lo
ponía el código, así que una consulta nueva que lo olvidara exponía borradores
ajenos sin que nada fallara.

## Decisión

`anon` puede leer:

- Noticias en estado `verificada`, y solo ésas.
- El registro de fuentes y los pesos del ranking, que ya eran públicos a
  propósito (ADR 0002 y 0003).
- El desglose de validación de las noticias que puede ver.
- Las cuentas verificadas, para poder mostrar quién respalda una noticia.

Todo lo demás sigue exigiendo sesión: comentar, reaccionar, publicar, moderar,
el chatbot, la bitácora y cualquier cosa sobre usuarios.

## Por qué

Lo importante no es que el feed sea público. Es que **con esto las políticas de
fila vuelven a ser la frontera de verdad**. La diferencia es la que hay entre un
control y una costumbre: antes el filtro estaba en el código y había que
acordarse de ponerlo; ahora vive en la política, el código no puede olvidarlo, y
una consulta nueva nace segura.

El chatbot es la excepción y sí exige sesión, pero no por el contenido —responde
sobre el mismo feed público— sino por el **presupuesto**. El tope diario de la
capa 0 solo significa algo si hay a quién contárselo; mientras no hubo sesiones,
todos los visitantes compartían un contador y el tope no protegía nada. Con $20
de presupuesto total, eso era un agujero por donde se iba el proyecto.

## Consecuencias

- La llave de servicio queda reservada para lo que, por diseño, ninguna persona
  puede hacer: validar noticias, recalcular el ranking y escribir la bitácora.
- La superficie de `anon` es la más expuesta del proyecto: cualquiera en
  internet con la llave publicable —que por diseño va en el navegador— puede
  consultar exactamente eso. Por eso la sección 11 de `tests/rls/` tiene una
  aserción por cada cosa que puede y por cada cosa que no.
- Las pantallas siguen escondiendo los enlaces que no corresponden al rol, pero
  **eso decide qué mostrar, no qué se puede hacer**. Esconder un botón no es un
  control de seguridad; que el `insert` falle, sí. Las dos cosas están probadas
  por separado.
- Queda pendiente decidir la retención de las conversaciones del chatbot: ahora
  que tienen dueño identificado, guardan texto de personas concretas y eso tiene
  implicaciones de privacidad que el informe de la Fase 7 debe tratar.
