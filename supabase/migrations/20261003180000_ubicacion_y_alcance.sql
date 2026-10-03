-- ===========================================================================
-- Ubicación simulada y alcance geográfico de las noticias
--
-- El enunciado pide que cada usuario elija una ubicación simulada —no el GPS—
-- y que la personalización dependa de ella, al punto de que dos compañeros con
-- ubicaciones distintas vean feeds distintos. Para eso hacen falta dos datos que
-- el esquema no tenía: DÓNDE está el usuario, y A QUIÉN le importa cada noticia.
--
-- Tres decisiones:
--
-- 1. **Las ubicaciones son una lista cerrada**, no texto libre: los 22
--    departamentos de Guatemala y algunos países. Comparar «Quetzaltenango» con
--    «quetzaltenango » no es personalización, es un error esperando pasar.
--
-- 2. **El alcance lo declara quien publica.** Local (de una zona), nacional (de
--    un país) o internacional. No lo infiere ningún modelo: decidir a quién le
--    importa una noticia es un juicio editorial (ADR 0002), y el enunciado pide
--    que la información registrada permita «determinar su relevancia para
--    distintos usuarios».
--
-- 3. **La ubicación del usuario NO va en `usuarios`.** Esa tabla la puede leer
--    cualquier usuario con sesión —el feed muestra el nombre de los autores—, y
--    la ubicación de alguien, aunque sea simulada, no es asunto de los demás.
--    Va en una tabla propia donde cada quien ve y toca solo su fila.
-- ===========================================================================

-- --- Las ubicaciones -------------------------------------------------------

create table public.ubicaciones (
  id     text primary key check (id ~ '^[A-Z]{2}(-[A-Z]{2})?$'),
  nombre text not null,
  pais   text not null check (pais ~ '^[A-Z]{2}$'),
  tipo   text not null check (tipo in ('departamento', 'pais')),
  orden  smallint not null default 100
);

comment on table public.ubicaciones is
  'Ubicaciones simuladas que un usuario puede elegir. Lista cerrada: departamentos de Guatemala y algunos países.';

insert into public.ubicaciones (id, nombre, pais, tipo, orden) values
  ('GT-GU', 'Guatemala',      'GT', 'departamento', 1),
  ('GT-AV', 'Alta Verapaz',   'GT', 'departamento', 10),
  ('GT-BV', 'Baja Verapaz',   'GT', 'departamento', 10),
  ('GT-CM', 'Chimaltenango',  'GT', 'departamento', 10),
  ('GT-CQ', 'Chiquimula',     'GT', 'departamento', 10),
  ('GT-PR', 'El Progreso',    'GT', 'departamento', 10),
  ('GT-ES', 'Escuintla',      'GT', 'departamento', 10),
  ('GT-HU', 'Huehuetenango',  'GT', 'departamento', 10),
  ('GT-IZ', 'Izabal',         'GT', 'departamento', 10),
  ('GT-JA', 'Jalapa',         'GT', 'departamento', 10),
  ('GT-JU', 'Jutiapa',        'GT', 'departamento', 10),
  ('GT-PE', 'Petén',          'GT', 'departamento', 10),
  ('GT-QZ', 'Quetzaltenango', 'GT', 'departamento', 10),
  ('GT-QC', 'Quiché',         'GT', 'departamento', 10),
  ('GT-RE', 'Retalhuleu',     'GT', 'departamento', 10),
  ('GT-SA', 'Sacatepéquez',   'GT', 'departamento', 10),
  ('GT-SM', 'San Marcos',     'GT', 'departamento', 10),
  ('GT-SR', 'Santa Rosa',     'GT', 'departamento', 10),
  ('GT-SO', 'Sololá',         'GT', 'departamento', 10),
  ('GT-SU', 'Suchitepéquez',  'GT', 'departamento', 10),
  ('GT-TO', 'Totonicapán',    'GT', 'departamento', 10),
  ('GT-ZA', 'Zacapa',         'GT', 'departamento', 10),
  ('MX',    'México',         'MX', 'pais', 200),
  ('SV',    'El Salvador',    'SV', 'pais', 200),
  ('HN',    'Honduras',       'HN', 'pais', 200),
  ('US',    'Estados Unidos', 'US', 'pais', 200),
  ('ES',    'España',         'ES', 'pais', 200);

-- Datos de referencia: los puede leer cualquiera, nadie los escribe desde el
-- cliente.
alter table public.ubicaciones enable row level security;
revoke all on public.ubicaciones from anon, authenticated;
grant select on public.ubicaciones to anon, authenticated;

create policy "ubicaciones_lectura" on public.ubicaciones
  for select to anon, authenticated
  using (true);

-- --- El alcance de cada noticia -------------------------------------------

create type public.alcance_geografico as enum ('local', 'nacional', 'internacional');

alter table public.noticias
  -- Lo ya publicado queda como nacional de Guatemala, que es lo que es la mayor
  -- parte del acervo. Los datos de demostración se corrigen uno por uno en los
  -- scripts de siembra; no se le inventa una zona a nada.
  add column alcance public.alcance_geografico not null default 'nacional',
  add column pais text default 'GT' check (pais is null or pais ~ '^[A-Z]{2}$'),
  add column id_ubicacion text references public.ubicaciones (id),

  -- Una noticia local es local DE ALGÚN LUGAR, y una nacional es de algún país.
  -- Sin esto, el factor geográfico tendría que adivinar.
  add constraint noticias_local_tiene_zona check (alcance <> 'local' or id_ubicacion is not null),
  add constraint noticias_nacional_tiene_pais check (alcance <> 'nacional' or pais is not null);

create index noticias_alcance_idx
  on public.noticias (alcance, id_ubicacion)
  where estado = 'verificada';

comment on column public.noticias.alcance is
  'A quién le importa la noticia: a una zona (local), a un país (nacional) o en general (internacional). Lo declara quien publica.';

-- --- Las preferencias de cada usuario --------------------------------------

create table public.preferencias_usuario (
  id_usuario      uuid primary key references public.usuarios (id) on delete cascade,
  -- Guatemala por omisión: es una plataforma guatemalteca, y la app lo muestra
  -- en pantalla para que se cambie.
  id_ubicacion    text not null default 'GT-GU' references public.ubicaciones (id),
  -- Reiniciar los intereses no borra lecturas —esas alimentan también el
  -- ranking global—: mueve esta fecha, y solo cuenta lo leído después.
  intereses_desde timestamptz,
  actualizado_en  timestamptz not null default now()
);

comment on table public.preferencias_usuario is
  'Ubicación simulada y punto de reinicio de intereses. Cada usuario ve y toca solo su fila.';

alter table public.preferencias_usuario enable row level security;
revoke all on public.preferencias_usuario from anon, authenticated;
grant select, insert, update on public.preferencias_usuario to authenticated;

create policy "preferencias_propias_lectura" on public.preferencias_usuario
  for select to authenticated
  using (id_usuario = (select auth.uid()));

create policy "preferencias_propias_alta" on public.preferencias_usuario
  for insert to authenticated
  with check (id_usuario = (select auth.uid()));

create policy "preferencias_propias_edicion" on public.preferencias_usuario
  for update to authenticated
  using (id_usuario = (select auth.uid()))
  with check (id_usuario = (select auth.uid()));
