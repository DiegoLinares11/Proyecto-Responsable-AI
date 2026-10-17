-- ===========================================================================
-- El chat es temporal (R-04), paso 1 de 2
--
-- El servidor deja de escribir el texto de las conversaciones. Mientras la
-- columna siga siendo obligatoria, ese código no se puede publicar: cada turno
-- fallaría al guardarse. Este paso solo le quita la obligación, no borra nada,
-- y deja publicar el servidor nuevo antes de quitar la columna (paso 2,
-- 20261016120100_chat_temporal.sql).
-- ===========================================================================

alter table public.mensajes alter column contenido drop not null;
