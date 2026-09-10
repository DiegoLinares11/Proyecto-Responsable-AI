# ADR 0005 — Suscripción para desarrollar, API para desplegar

**Estado:** aceptada · **Fecha:** 2026-09-10

## Contexto

Desarrollar el chatbot son cientos de llamadas de prueba. Gastar crédito de API
en cada iteración se come el presupuesto antes de tener algo que evaluar. En
Rosmary ya usamos el Claude Agent SDK contra la suscripción local, y funciona.

Pero son dos cosas distintas: la suscripción sirve para trabajar en local; una
aplicación desplegada que atiende usuarios necesita crédito de API. No es un
detalle de implementación, es una condición de uso.

## Decisión

Una interfaz `ProveedorLlm` con dos implementaciones, elegidas por la variable
de entorno `LLM_MODO`:

| Modo | Implementación | Para qué | Costo |
|---|---|---|---|
| `suscripcion` | `@anthropic-ai/claude-agent-sdk` contra la sesión local | Desarrollo e iteración | Suscripción |
| `api` | `@anthropic-ai/sdk` con `ANTHROPIC_API_KEY` | Mediciones formales y despliegue | Crédito |

La interfaz expone lo mínimo que el chatbot necesita: clasificar una intención y
generar una respuesta con esquema y herramientas. Ningún módulo fuera de
`modules/chatbot/proveedor/` sabe cuál está activa.

```
src/modules/chatbot/proveedor/
  ├── tipos.ts                  la interfaz ProveedorLlm
  ├── proveedor-suscripcion.ts  Agent SDK, solo desarrollo
  ├── proveedor-api.ts          SDK de Anthropic, despliegue
  └── index.ts                  elige según LLM_MODO
```

## Por qué

**El presupuesto se conserva para lo que importa.** Las fases 1 a 3 no tocan el
modelo. La fase 4 se desarrolla contra la suscripción. El crédito se reserva
para las corridas de evaluación que van al informe y para el despliegue.

**Las mediciones tienen que ser comparables.** El informe reporta costo real por
conversación, y eso solo se mide por la API, que devuelve el consumo de tokens
en cada respuesta. Por eso el modo `api` no es solo para producción: es el que
produce los números de la Fase 5.

**Cambiar de proveedor no debe tocar la lógica de defensa.** Las cinco capas son
lo que se evalúa; no pueden depender de por dónde entra el modelo.

## Consecuencias

- `LLM_MODO=suscripcion` queda prohibido en el despliegue. El arranque falla si
  detecta ese modo en entorno de producción, para que sea un error ruidoso y no
  una omisión silenciosa.
- Los dos caminos no son idénticos: el Agent SDK trae su propio arnés y sus
  herramientas integradas. Hay que apagar las que no correspondan y no asumir
  que lo probado en `suscripcion` se comporta igual en `api`. **Toda evaluación
  que vaya al informe corre en modo `api`.**
- Un caso de prueba por modo que verifique que la interfaz responde igual, para
  que la diferencia salte temprano.
- El informe explica esta separación. Respetar las condiciones de uso de la
  herramienta es parte del trabajo en un curso de IA responsable, no un
  tecnicismo aparte.
