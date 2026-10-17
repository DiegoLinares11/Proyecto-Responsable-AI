-- ===========================================================================
-- Lo no confirmado se comunica como tal (R-13)
--
-- Una noticia puede publicarse «en desarrollo»: lo que dice todavía no está
-- confirmado, y la portada, la lectura y el chat lo dicen con esas palabras.
--
-- Solo una persona la publica así. No hace falta una política nueva para eso:
-- la restricción de abajo exige que solo una noticia publicada (`verificada`)
-- pueda estar en desarrollo, y publicar es, por las políticas de fila, cosa de
-- un moderador que no es el autor (20261016150000). Un autor no puede marcar
-- su borrador, porque un borrador no puede estar en desarrollo. El motivo
-- escrito queda en la auditoría de la decisión, como cualquier otra.
--
-- Cuando se confirma, un moderador quita la marca. Sacarla de publicación
-- también la quita: la restricción no deja otra.
-- ===========================================================================

alter table public.noticias
  add column en_desarrollo boolean not null default false;

alter table public.noticias
  add constraint noticias_en_desarrollo_publicada
  check (not en_desarrollo or estado = 'verificada');

comment on column public.noticias.en_desarrollo is
  'Publicada como en desarrollo: lo que dice todavía no está confirmado (R-13). Solo una noticia verificada puede estarlo.';
