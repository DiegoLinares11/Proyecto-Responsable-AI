# Arquitectura

## Vista general

```
Navegador
   │
   ├── Feed, noticia, panel del publicador, cola de moderación
   └── Ventana del chatbot
   │
   ▼
Next.js (App Router)  ── el único que habla con la base y con Claude
   │
   ├── modules/noticias     alta, edición, borradores, publicación
   ├── modules/fuentes      registro de medios y credibilidad
   ├── modules/ranking      cálculo y recálculo del puntaje
   ├── modules/moderacion   cola humana y decisiones
   ├── modules/chatbot      las cinco capas de defensa
   └── modules/auditoria    bitácora append-only
   │
   ├──────────────► Supabase (Postgres + Auth + RLS)
   │
   ├──────────────► GDELT · Google Fact Check Tools   (gratuitas, 0 tokens)
   │
   └──────────────► Claude   (solo desde modules/chatbot)
```

Una regla estructural: **`modules/chatbot` es el único que puede llamar a
Claude**. Cualquier otro módulo que quisiera usar el modelo tendría que
justificarse en un ADR, porque estaría gastando presupuesto que está asignado.

El corte por módulos sigue el patrón del módulo de Noticias de Zuntex: cada uno
con sus servicios adentro y una superficie pública chica. Es una arquitectura
que el equipo ya conoce.

## Flujo: publicar una noticia

```
publicador envía
      │
      ▼
¿tiene noticias_publicar?  ── no ──► 403 (RLS lo bloquea en el motor)
      │ sí
      ▼
se guarda como borrador
      │
      ▼
canal de validación (Fase 2, sin tokens)
   credibilidad · URL real · corroboración · desmentidos · coherencia
      │
      ▼
puntaje_veracidad + desglose por señal
      │
      ├── ≥ 75 ──────────► verificada ──► entra al ranking
      ├── 45–74 ────────► cola de moderación ──► decide una persona
      ├── < 45 ─────────► no_verificable ──► el autor ve por qué
      └── desmentida ───► bloqueada
      │
      ▼
todo queda en auditoria
```

## Flujo: una pregunta al chatbot

```
mensaje del usuario
      │
      ▼
Capa 0  filtro determinista + límite de peticiones      0 tokens
      │
      ▼
Capa 1  clasificador de intención (Haiku 4.5)           ~$0.0004
      │
      ├── fuera de dominio / dañino / desvío ──► negativa estándar + bitácora
      │
      ▼ consulta legítima
recuperación desde Postgres (búsqueda de texto + ranking)
      │
      ▼
Capa 2  respuesta (Sonnet 5)                            ~$0.011
   noticias delimitadas como datos · 3 herramientas · salida con esquema
      │
      ▼
Capa 3  guardia de salida                                0 tokens
   ¿existen las noticias citadas? ¿hay código? ¿se filtró el sistema?
      │
      ├── falla ──► respuesta descartada + bitácora
      ▼
Capa 4  bitácora (decisiones, tokens, latencia)
      │
      ▼
usuario
```

## Esquema de base (borrador de la Fase 1)

| Tabla | Qué guarda | Notas |
|---|---|---|
| `usuarios` | Perfil ligado a Supabase Auth | `creado_en` alimenta el peso por antigüedad |
| `roles` | Los roles del sistema | |
| `permisos_rol` | Qué claves tiene cada rol | `noticias_publicar`, `noticias_moderar`, … |
| `silencios` | Qué acción se le quitó a una persona | Solo quita, nunca da |
| `cuentas_verificadas` | Usuario, `autoridad` 0–100, quién la otorgó | Entra al ranking |
| `fuentes` | Dominio, credibilidad, nivel, **justificación** | Curado a mano; es opinión editorial |
| `noticias` | Contenido, autor, estado, componentes del puntaje | Cada componente por separado |
| `validaciones` | Una fila por señal por noticia | El desglose que se le muestra al usuario |
| `interacciones` | Quién, qué noticia, qué tipo, cuándo | Único por usuario/noticia/tipo |
| `pesos_ranking` | Configuración de la fórmula, con historial | Cambiar un peso deja rastro |
| `conversaciones` y `mensajes` | Historial del chatbot | Con política de retención |
| `auditoria` | Append-only: qué decidió el sistema y por qué | Sin `update` ni `delete` |

## Decisiones registradas

| ADR | Decisión |
|---|---|
| [0001](adr/0001-stack.md) | Next.js, Supabase y Vercel |
| [0002](adr/0002-validacion-determinista.md) | La validación no usa modelo |
| [0003](adr/0003-ranking-explicable.md) | El ranking es una fórmula publicada |
| [0004](adr/0004-defensa-en-profundidad-chatbot.md) | La defensa está en la arquitectura, no en la detección |
| [0005](adr/0005-proveedor-llm-conmutable.md) | Suscripción para desarrollar, API para desplegar |
