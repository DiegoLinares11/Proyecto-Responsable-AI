# Presupuesto

El proyecto se financia con $20. Este documento dice a dónde se van y por qué
alcanzan.

## El reparto

| Subsistema | Estrategia | Tokens |
|---|---|---|
| Permisos de publicación | Roles en base + RLS | 0 |
| Validación de veracidad | Registro de fuentes + APIs públicas gratuitas | 0 |
| Ranking de relevancia | Fórmula determinista | 0 |
| Infraestructura | Planes gratuitos de Supabase y Vercel | $0 |
| **Chatbot** | **Claude** | **todo** |

Ese es el truco completo del proyecto. La consigna dice «resolver todo esto con
$20», y la respuesta no es exprimir el modelo: es **no meterlo donde no hace
falta**. Un modelo no ordena un feed mejor que una fórmula, y no sabe si una
noticia de esta mañana es cierta. En cambio conversar sí lo hace mejor que
cualquier código que escribamos. Ahí van los $20.

Como efecto secundario, las partes sin modelo salen explicables, reproducibles
y auditables — que es lo que el curso pide de todos modos. La restricción de
presupuesto y la restricción ética empujan para el mismo lado.

## Costo por conversación

Precios de referencia por millón de tokens:

| Modelo | Entrada | Salida |
|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 |
| Claude Sonnet 5 | $2.00 | $10.00 |
| Claude Opus 5 | $5.00 | $25.00 |

Lo leído desde caché cuesta una fracción de la entrada normal, y el prompt del
sistema del chatbot es estable por diseño, así que casi siempre pega en caché.

**Estimación por turno**, con Haiku 4.5 de guardia y Sonnet 5 respondiendo:

| Concepto | Tokens | Costo |
|---|---|---|
| Guardia — sistema en caché | ~500 | ~$0.00005 |
| Guardia — mensaje del usuario | ~150 | ~$0.00015 |
| Guardia — salida | ~40 | ~$0.0002 |
| Respuesta — sistema y herramientas en caché | ~1,200 | ~$0.00024 |
| Respuesta — noticias recuperadas e historial | ~3,000 | ~$0.006 |
| Respuesta — salida | ~450 | ~$0.0045 |
| **Total** | | **≈ $0.0115** |

Con eso, **$20 rinden alrededor de 1,700 turnos**. Una conversación típica son
cuatro o cinco turnos, así que hablamos de unas 350–400 conversaciones
completas, más las corridas del red team.

Si se usa Opus 5 para responder, el turno sube a ~$0.027 y el presupuesto da
unos 730 turnos. Sigue siendo suficiente para el curso, y la decisión se toma
con datos: primero se mide la calidad con Sonnet 5 y solo se sube si hace falta.

> Estos números son estimaciones. La Fase 4d registra `usage` real en cada
> llamada, así que a partir de la primera semana el costo deja de ser un
> cálculo y pasa a ser una medición. El informe reporta el real.

## Cómo no gastarlo de un jalón

**El guardia barato va primero.** Un mensaje fuera de dominio muere en Haiku
por $0.0004, no en Sonnet por $0.011. En una corrida de red team con 100
ataques, la diferencia es real.

**Límite por usuario y global.** Tope de mensajes por usuario y por día, y un
tope de gasto acumulado que apaga el chatbot antes que vaciar la cuenta.

**Caché de verdad.** El prompt del sistema y las definiciones de herramientas
no cambian entre llamadas. Se verifica midiendo los tokens leídos de caché: si
salen en cero llamada tras llamada, algo lo está invalidando — casi siempre una
fecha o un identificador metido en el prompt del sistema.

**Respuestas cortas.** La salida cuesta cinco veces lo que la entrada. Un
chatbot de noticias debe contestar en párrafos, no en ensayos, y el esquema de
salida lo obliga.

**El red team corre en lote.** Las corridas de evaluación no son
interactivas y pueden ir por la API de lotes, a mitad de precio.

## Desarrollo sin gastar

Durante las fases 1 a 3 no se toca el crédito porque no hay modelo. En la fase
4, el desarrollo del día a día corre contra la suscripción local con el Claude
Agent SDK, y el crédito de API se reserva para las mediciones formales y el
despliegue. Ver
[adr/0005-proveedor-llm-conmutable.md](adr/0005-proveedor-llm-conmutable.md).

Un punto que conviene tener claro y escribir en el informe: la suscripción
personal es para desarrollar y probar en local. Una aplicación desplegada que
atiende usuarios necesita crédito de API. No es un tecnicismo — es una
condición de uso, y en un curso de IA responsable respetarla es parte del
trabajo.
