-- ===========================================================================
-- Fase 1 — Fuentes, noticias y el desglose de validación
--
-- El esquema deja preparado el trabajo de las fases 2 y 3, pero no lo hace:
-- aquí solo viven las columnas. El canal de validación es la Fase 2
-- (docs/validacion-noticias.md) y el cálculo del ranking la Fase 3
-- (docs/ranking-relevancia.md).
-- ===========================================================================

create type public.nivel_fuente as enum (
  'agencia_internacional',
  'medio_nacional',
  'medio_digital',
  'blog',
  'desconocido'
);

create type public.estado_noticia as enum (
  'borrador',
  'en_revision',
  'verificada',
  'no_verificable',
  'desmentida',
  'archivada'
);

create type public.senal_validacion as enum (
  'credibilidad_fuente',
  'url_verificable',
  'corroboracion',
  'desmentido',
  'coherencia'
);

-- ---------------------------------------------------------------------------
-- Registro de fuentes
-- ---------------------------------------------------------------------------

create table public.fuentes (
  id                   bigint generated always as identity primary key,
  dominio              text not null unique check (dominio = lower(dominio)),
  nombre               text not null,
  nivel                public.nivel_fuente not null default 'desconocido',
  puntaje_credibilidad smallint not null default 20
                         check (puntaje_credibilidad between 0 and 100),
  justificacion        text not null check (length(trim(justificacion)) >= 20),
  curada_por           uuid references public.usuarios (id) on delete set null,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

comment on table public.fuentes is
  'Registro curado a mano. ES una posición editorial, no un hecho — ver ADR 0002.';
comment on column public.fuentes.justificacion is
  'Por qué este medio tiene ese puntaje. Obligatoria: un número sin razón no es auditable.';
comment on column public.fuentes.puntaje_credibilidad is
  'Un dominio desconocido entra bajo (20) y va a moderación. Nunca se rechaza por no estar en la lista.';

create trigger al_editar_fuente_tocar_fecha
  before update on public.fuentes
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Noticias
-- ---------------------------------------------------------------------------

create table public.noticias (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (length(trim(titulo)) between 10 and 300),
  resumen       text not null check (length(trim(resumen)) between 20 and 1000),
  cuerpo        text not null check (length(trim(cuerpo)) >= 50),
  url_original  text check (url_original ~ '^https?://'),
  id_fuente     bigint references public.fuentes (id) on delete restrict,
  id_autor      uuid not null references public.usuarios (id) on delete restrict,

  estado             public.estado_noticia not null default 'borrador',
  puntaje_veracidad  smallint check (puntaje_veracidad between 0 and 100),
  publicada_en       timestamptz,

  -- Componentes del ranking, guardados por separado para poder mostrar el
  -- "¿por qué está aquí?" sin recalcular nada (docs/ranking-relevancia.md).
  componente_interacciones numeric(10,4) not null default 0,
  componente_verificadas   numeric(10,4) not null default 0,
  componente_fuente        numeric(10,4) not null default 0,
  componente_veracidad     numeric(10,4) not null default 0,
  penalizacion_estado      numeric(10,4) not null default 0,
  relevancia               numeric(12,4) not null default 0,
  relevancia_calculada_en  timestamptz,

  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  -- Una noticia publicada tiene fecha de publicación, y una que no, no la
  -- tiene. Sin esto el feed ordena por un campo que a veces miente.
  constraint noticias_publicada_tiene_fecha check (
    (estado = 'verificada') = (publicada_en is not null)
  )
);

comment on table public.noticias is
  'El estado lo mueve el canal de validación (Fase 2) o un moderador. Un publicador solo crea borradores.';

-- Búsqueda de texto en español. La usa la recuperación del chatbot (Fase 4b)
-- y la corroboración interna de la Fase 2.
alter table public.noticias
  add column busqueda tsvector
  generated always as (
    to_tsvector(
      'spanish'::regconfig,
      coalesce(titulo, '') || ' ' || coalesce(resumen, '') || ' ' || coalesce(cuerpo, '')
    )
  ) stored;

create index noticias_busqueda_idx on public.noticias using gin (busqueda);

-- El feed: verificadas, de mayor a menor relevancia.
create index noticias_feed_idx
  on public.noticias (relevancia desc, publicada_en desc)
  where estado = 'verificada';

create index noticias_id_autor_idx on public.noticias (id_autor);
create index noticias_estado_idx on public.noticias (estado);

create trigger al_editar_noticia_tocar_fecha
  before update on public.noticias
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- El ranking no se edita a mano
--
-- La política RLS deja que un publicador edite su propio borrador. Sin esta
-- guarda podría escribir `relevancia = 99999` en el borrador y quedarse con el
-- valor inflado cuando un moderador lo apruebe.
-- ---------------------------------------------------------------------------

create or replace function public.impedir_edicion_de_ranking()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.es_rol_de_servicio() then
    return new;
  end if;

  if new.componente_interacciones is distinct from old.componente_interacciones
     or new.componente_verificadas is distinct from old.componente_verificadas
     or new.componente_fuente      is distinct from old.componente_fuente
     or new.componente_veracidad   is distinct from old.componente_veracidad
     or new.penalizacion_estado    is distinct from old.penalizacion_estado
     or new.relevancia             is distinct from old.relevancia
     or new.puntaje_veracidad      is distinct from old.puntaje_veracidad
  then
    raise exception 'El puntaje y la relevancia los calcula el servidor, no el autor'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger al_editar_noticia_impedir_edicion_de_ranking
  before update on public.noticias
  for each row execute function public.impedir_edicion_de_ranking();

-- ---------------------------------------------------------------------------
-- Validaciones — el desglose que se le muestra al usuario
--
-- Una fila por señal por noticia. Nunca se muestra el puntaje sin esto.
-- ---------------------------------------------------------------------------

create table public.validaciones (
  id          bigint generated always as identity primary key,
  id_noticia  uuid not null references public.noticias (id) on delete cascade,
  senal       public.senal_validacion not null,
  aporte      numeric(6,2) not null,
  disponible  boolean not null default true,
  detalle     jsonb not null default '{}'::jsonb,
  evaluada_en timestamptz not null default now(),
  unique (id_noticia, senal)
);

comment on column public.validaciones.disponible is
  'False cuando la fuente externa no respondió. Una señal indisponible manda la noticia a moderación; nunca se asume corroborada por falta de datos (ADR 0002).';
comment on column public.validaciones.detalle is
  'La evidencia: qué medios corroboraron, qué devolvió el verificador de hechos, qué decían los metadatos.';

create index validaciones_id_noticia_idx on public.validaciones (id_noticia);
