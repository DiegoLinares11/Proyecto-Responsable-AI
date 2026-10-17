-- ===========================================================================
-- El chat es temporal (R-04), paso 2 de 2
--
-- Lo que alguien le pregunta al asistente, y lo que el asistente le contesta,
-- vive en su pantalla y desaparece al cerrarla. En la base no queda el texto.
--
-- Se quita la columna en vez de dejarla vacía: así no hay dónde guardarlo,
-- aunque mañana alguien vuelva a escribir código que lo intente. Con ella se
-- va el texto de los turnos anteriores. La suite de RLS comprueba que la
-- columna no existe (sección 17).
--
-- Quedan los metadatos que necesitan el tope diario por usuario (rol y fecha),
-- el tope de gasto (modelo, tokens y costo, que lee `vista_gasto_api`) y la
-- auditoría de la defensa (qué decidió cada capa).
-- ===========================================================================

alter table public.mensajes drop column contenido;

-- El motivo de un bloqueo de la capa 1 traía el razonamiento del clasificador,
-- que parafrasea lo que escribió la persona («el usuario pide una receta…»).
-- Era el texto del chat por la puerta de atrás: se deja solo la categoría. El
-- servidor ya lo guarda así (motivoParaGuardar en src/app/api/chat/puertos.ts).
update public.mensajes
   set motivo_bloqueo = split_part(motivo_bloqueo, ':', 1)
 where motivo_bloqueo like 'Clasificado como %:%';
