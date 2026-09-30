-- ===========================================================================
-- Fase 3 — Insumos del ranking
--
-- El cálculo vive en TypeScript, no en SQL, porque ahí se puede probar con
-- aserciones legibles y porque el desglose que se le muestra al usuario sale del
-- mismo código que produce el número. Lo que hace falta de la base es juntar los
-- insumos en un solo lugar.
--
-- Dos vistas, ambas con `security_invoker = true`. Sin eso, una vista corre con
-- los permisos de su dueño —`postgres`— y se salta las políticas de fila de las
-- tablas que consulta. Sería un agujero que además no se ve: la vista funciona,
-- solo que muestra más de lo que debe.
--
-- Y hay que REVOCAR el acceso, no solo «no otorgarlo». Supabase define
-- privilegios por omisión sobre todo lo que se crea en `public`, y eso incluye
-- las vistas: nacen legibles por `anon` y `authenticated`, o sea publicadas en
-- la API. La suite de tests/rls lo detectó cuando esta migración se limitaba a
-- no otorgar nada.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Nivel noticia: estado, antigüedad, credibilidad de la fuente y veracidad
-- ---------------------------------------------------------------------------

create view public.vista_noticias_ranking
with (security_invoker = true) as
select
  n.id                    as id_noticia,
  n.estado,
  n.publicada_en,
  f.puntaje_credibilidad  as credibilidad_fuente,
  n.puntaje_veracidad
from public.noticias n
left join public.fuentes f on f.id = n.id_fuente;

comment on view public.vista_noticias_ranking is
  'Insumos de nivel noticia para el ranking (Fase 3). security_invoker: respeta las políticas de fila de quien consulta.';

-- ---------------------------------------------------------------------------
-- Nivel interacción
--
-- Une `interacciones` (lecturas y reacciones) con `comentarios`, que vive
-- aparte porque lleva texto y se modera. El ranking los trata como tres tipos
-- de la misma familia, así que aquí se vuelven a juntar.
--
-- Se necesita el detalle fila por fila y no un conteo: el peso de cada
-- interacción depende de la antigüedad de la cuenta que la hizo, y la detección
-- de ráfagas necesita las marcas de tiempo. Un `count(*)` perdería las dos
-- cosas.
-- ---------------------------------------------------------------------------

create view public.vista_interacciones_ranking
with (security_invoker = true) as
select
  i.id_noticia,
  i.tipo::text            as tipo,
  i.creado_en             as creada_en,
  u.creado_en             as cuenta_creada_en,
  cv.autoridad
from public.interacciones i
join public.usuarios u on u.id = i.id_usuario
left join public.cuentas_verificadas cv on cv.id_usuario = u.id

union all

select
  c.id_noticia,
  'comentario'            as tipo,
  c.creado_en             as creada_en,
  u.creado_en             as cuenta_creada_en,
  cv.autoridad
from public.comentarios c
join public.usuarios u on u.id = c.id_usuario
left join public.cuentas_verificadas cv on cv.id_usuario = u.id
-- Un comentario oculto por moderación no debe seguir empujando la noticia
-- hacia arriba. Ocultar y que siga contando sería ocultar a medias.
where not c.oculto;

comment on view public.vista_interacciones_ranking is
  'Una fila por interacción, con la antigüedad de la cuenta y su autoridad. El ranking necesita el detalle: los pesos dependen de la cuenta y la detección de ráfagas de las marcas de tiempo.';

-- ---------------------------------------------------------------------------
-- Sacarlas de la API
-- ---------------------------------------------------------------------------

revoke all on public.vista_noticias_ranking from anon, authenticated;
revoke all on public.vista_interacciones_ranking from anon, authenticated;

grant select on public.vista_noticias_ranking to service_role;
grant select on public.vista_interacciones_ranking to service_role;

-- ---------------------------------------------------------------------------
-- Resultado de la detección de ráfagas
--
-- Se guarda para que la cola de moderación pueda mostrarlo. El sistema marca y
-- escala a una persona; no borra interacciones ni castiga cuentas por su cuenta
-- (docs/ranking-relevancia.md).
-- ---------------------------------------------------------------------------

alter table public.noticias
  add column rafaga_sospechosa boolean not null default false,
  add column rafaga_motivo text,
  add column rafaga_revisada_por uuid references public.usuarios (id) on delete set null;

comment on column public.noticias.rafaga_sospechosa is
  'True cuando el pico de interacciones viene mayoritariamente de cuentas nuevas. Es una heurística que se equivoca: marca para revisión humana, no castiga.';

create index noticias_rafaga_pendiente_idx
  on public.noticias (publicada_en desc)
  where rafaga_sospechosa and rafaga_revisada_por is null;

-- Índice para recalcular por lotes: primero lo más viejo sin recalcular.
create index noticias_por_recalcular_idx
  on public.noticias (relevancia_calculada_en nulls first)
  where estado in ('verificada', 'en_revision');
