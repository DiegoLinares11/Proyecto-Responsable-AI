# ADR 0002 — La validación de veracidad no usa modelo

**Estado:** aceptada · **Fecha:** 2026-09-10

## Contexto

Hay que decidir si una noticia es real y viene de fuente confiable. La opción
obvia es preguntarle a Claude. La otra es construir un canal de señales
verificables.

## Decisión

La validación es enteramente determinista: registro de fuentes curado a mano,
verificación de la URL y sus metadatos, corroboración contra GDELT, consulta a
Google Fact Check Tools y comprobaciones de coherencia interna. Cero tokens.

## Por qué

**El modelo no sabe.** Tiene corte de entrenamiento. Una noticia de esta mañana
está fuera de lo que puede saber, y preguntarle produce una respuesta segura de
sí misma sobre algo que está adivinando. Ese es el peor resultado posible en un
sistema cuyo propósito es distinguir lo real de lo falso.

**No se puede auditar.** «El modelo dijo que sí» no es una justificación que se
le pueda dar a un publicador cuya noticia fue rechazada, ni una que sostenga el
informe del curso. Cinco señales con su desglose sí lo son.

**El presupuesto está comprometido.** Validar con modelo consumiría crédito en
cada publicación, en la parte del sistema que menos se beneficia de él.

## Consecuencias

- Cada decisión de veracidad trae el desglose de qué señal aportó cuánto. La
  explicabilidad no se agrega después: es cómo funciona.
- El sistema depende de dos APIs externas gratuitas. Si GDELT no responde, la
  señal de corroboración se marca indisponible y la noticia va a moderación
  humana. Nunca se asume corroborada por falta de datos.
- El registro de fuentes es trabajo manual y **es una posición editorial**. Hay
  que declararlo, decir quién lo curó y con qué criterio, y reportar su punto
  ciego más probable: medios locales guatemaltecos legítimos que ningún índice
  internacional lista.
- Los medios pequeños van a caer en moderación más seguido que los grandes. Es
  una consecuencia del método, se mide y se reporta.
