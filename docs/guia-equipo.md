# Guía del equipo

## Integrantes

- Diego Linares 221256
- Diederich Solis
- Christian Echeverria
- Andy Fuentes

## Reparto propuesto

El reparto busca que nadie quede bloqueado esperando a otro. Las fases 2 y 3
son independientes entre sí y solo necesitan que el esquema de la Fase 1 exista.

| Fase | Responsable | Depende de |
|---|---|---|
| 0 — Cimientos | Diego | — |
| 1 — Esquema, roles y RLS | Diego | Fase 0 |
| 2 — Validación de veracidad | *por asignar* | Fase 1 |
| 3 — Ranking de relevancia | *por asignar* | Fase 1 |
| 4 — Chatbot y sus capas | Diego + *por asignar* | Fases 1–3 |
| 5 — Red team y evaluación | *por asignar* | Fase 4 |
| 6 — Interfaz y despliegue | *por asignar* | Fases 2–4 |
| 7 — Informe de IA responsable | Todos | Fase 5 |

La Fase 5 conviene que **no** la haga quien construyó la Fase 4. Quien escribió
la defensa tiene puntos ciegos sobre su propia defensa; que la ataque otro es
parte del método, no desconfianza.

## Cuenta y credenciales

Este repositorio es de la carpeta UVG. Los commits van con la identidad
académica, configurada **localmente** en el repo para no chocar con la
identidad de trabajo que está en la configuración global:

```bash
git config user.name "DiegoLinares11"
git config user.email "lin221256@uvg.edu.gt"
```

Cada quien pone su propio nombre y su correo UVG. Verificar antes del primer
commit:

```bash
git config user.email
```

Si sale un correo que no es el de la universidad, el commit va a quedar
atribuido a la cuenta equivocada.

## Ramas

Una rama por fase, con el número adelante para que el orden sea evidente:

```
fase-2-validacion
fase-3-ranking
fase-4a-guardias
```

De `main` sale todo y a `main` regresa todo por pull request. `main` siempre
tiene que estar en estado demostrable — si el catedrático clona el repo hoy,
debe poder correrlo.

## Commits

Conventional Commits en español, en imperativo, minúscula después del tipo, y
el asunto describiendo **qué cambia para quien usa el sistema**, no qué archivo
se tocó.

```
feat(validacion): corroborar noticias contra GDELT
fix(ranking): evitar que una noticia vieja domine el feed
docs: documentar las cinco capas de defensa del chatbot
test(redteam): agregar los ataques de inyección indirecta
chore: ignorar los archivos de entorno local
```

Tipos en uso: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

## Secretos

Nada de llaves en el repositorio. `.env.local` está en `.gitignore` y
`.env.example` documenta qué variables hacen falta, con valores de mentira.

Las llaves de API de Anthropic, si se llega a usarlas, van en las variables de
entorno de Vercel, nunca en el código ni en el cliente. Una llave de API que
llega al navegador es una llave pública, y con presupuesto de $20 eso se nota
el mismo día.

## Antes de abrir un pull request

```bash
npm run typecheck
npm run lint
npm test
./scripts/probar_rls.sh
```

El último levanta un PostgreSQL desechable, aplica las migraciones y comprueba
las políticas de fila. **Cualquier cambio a `supabase/migrations/` tiene que
correrlo**, porque una política mal escrita no falla ruidosamente: falla
dejando pasar. Y si el cambio agrega una regla de acceso, agrega también su
prueba en `tests/rls/` — la suite es la única forma de saber que la regla sigue
ahí dentro de tres semanas.

Un detalle de RLS que conviene tener presente al escribir esas pruebas: un
`update` o un `delete` que no alcanza ninguna fila **no lanza error**, afecta
cero filas y devuelve éxito. Solo el `insert` y el `with check` levantan
excepción. Código que asuma "no hubo error, entonces se guardó" tiene un fallo
silencioso.

Y para cambios en la Fase 4 o 5, además la corrida del red team, con el
resultado pegado en la descripción del PR. Un cambio al chatbot que baja la
tasa de bloqueo no entra sin que alguien lo haya visto y lo haya aceptado a
propósito.

## Qué hacer cuando algo del chatbot se rompe

1. Buscar el turno en la bitácora de auditoría — está el veredicto de cada capa.
2. Identificar qué capa debió atraparlo.
3. Escribir **primero** el caso en `tests/redteam/`, comprobar que falla.
4. Arreglar.
5. Correr el corpus completo, no solo el caso nuevo: es fácil tapar un agujero
   y abrir otro, o subir la tasa de falsos positivos sin darse cuenta.
