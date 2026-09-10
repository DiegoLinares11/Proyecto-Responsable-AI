# ADR 0001 — Next.js, Supabase y Vercel

**Estado:** aceptada · **Fecha:** 2026-09-10

## Contexto

El presupuesto total es $20 y está comprometido con el chatbot. La
infraestructura tiene que costar $0. El equipo ya trabajó con Express + Prisma
(Zuntex) y con Firebase Functions + Firestore (Proyecto 1 de este mismo curso),
así que ambas eran candidatas reales.

## Decisión

Next.js con App Router y TypeScript, Supabase para Postgres y autenticación, y
Vercel para el despliegue.

## Por qué

**Postgres sobre Firestore.** El ranking necesita agregaciones, joins y
consultas ordenadas por un campo calculado; la validación necesita búsqueda de
texto. En Firestore eso se vuelve desnormalización y funciones de mantenimiento.
En Postgres es SQL. El Proyecto 1 ya nos mostró dónde aprieta Firestore cuando
la consulta deja de ser una búsqueda por clave.

**RLS sobre middleware.** La regla de quién publica queda en el motor de base
de datos, no en una capa que se puede rodear. Es más fuerte que el patrón de
middleware que usamos en Zuntex, y para un proyecto cuyo tema es la
responsabilidad, tener el control de acceso donde no se puede saltar vale la
pena.

**Un repositorio en vez de dos.** Zuntex separa backend Express y frontend
Flutter. Para cuatro personas y un semestre, un solo proyecto con rutas de
servidor y componentes en el mismo árbol reduce el trabajo de coordinación, que
es el que suele hundir los proyectos de curso.

**Los tres planes gratuitos alcanzan** para el volumen de una demostración
académica.

## Consecuencias

- Nadie del equipo pone tarjeta. Los $20 quedan completos para el modelo.
- Las llaves de servicio viven en variables de entorno de Vercel y nunca llegan
  al navegador.
- Se pierde la separación tajante entre backend y frontend de Zuntex. Se
  compensa con la división por módulos en `src/modules/`, que conserva el mismo
  patrón de servicios con superficie pública chica.
- Si el proyecto creciera más allá del curso, Supabase y Vercel tienen techo en
  sus planes gratuitos. Fuera del alcance, pero anotado.
