-- ===========================================================================
-- Fase 1 — Interacciones, pesos del ranking, bitácora del chatbot y auditoría
--
-- Nota de diseño: docs/arquitectura.md describía una sola tabla
-- `interacciones` que guardaba lecturas, reacciones y comentarios. Se separan
-- los comentarios, porque llevan texto, se moderan y se borran, mientras que
-- lecturas y reacciones son un hecho binario con la restricción de unicidad
-- que sirve de tope anti-manipulación. Meterlos juntos obligaba a que esa
-- restricción no aplicara a los comentarios, y una regla con excepción en la
-- tabla que cuenta votos es justo donde no conviene tenerla.
-- ===========================================================================

create type public.tipo_interaccion as enum ('lectura', 'reaccion');

-- ---------------------------------------------------------------------------
-- Interacciones
--
-- La restricción de unicidad ES el tope por usuario del que habla
-- docs/ranking-relevancia.md. Recargar la página cien veces no suma cien
-- lecturas porque la base no lo permite, no porque el código se acuerde.
-- ---------------------------------------------------------------------------

create table public.interacciones (
  id         bigint generated always as identity primary key,
  id_noticia uuid not null references public.noticias (id) on delete cascade,
  id_usuario uuid not null references public.usuarios (id) on delete cascade,
  tipo       public.tipo_interaccion not null,
  creado_en  timestamptz not null default now(),
  unique (id_noticia, id_usuario, tipo)
);

create index interacciones_id_noticia_idx on public.interacciones (id_noticia, tipo);
create index interacciones_creado_en_idx on public.interacciones (creado_en desc);

comment on constraint interacciones_id_noticia_id_usuario_tipo_key on public.interacciones is
  'Tope por usuario del ranking: una persona aporta una vez por noticia y por tipo.';

-- ---------------------------------------------------------------------------
-- Comentarios
-- ---------------------------------------------------------------------------

create table public.comentarios (
  id             bigint generated always as identity primary key,
  id_noticia     uuid not null references public.noticias (id) on delete cascade,
  id_usuario     uuid not null references public.usuarios (id) on delete cascade,
  contenido      text not null check (length(trim(contenido)) between 2 and 2000),
  oculto         boolean not null default false,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on column public.comentarios.oculto is
  'Los moderadores ocultan, no borran. Queda el rastro de que hubo algo y de quién lo quitó.';

create index comentarios_id_noticia_idx on public.comentarios (id_noticia, creado_en desc);

create trigger al_editar_comentario_tocar_fecha
  before update on public.comentarios
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Pesos del ranking
--
-- Con historial: cambiar un peso es una decisión editorial y deja rastro de
-- quién y por qué (ADR 0003). La fila vigente es la que no tiene `vigente_hasta`.
-- ---------------------------------------------------------------------------

create table public.pesos_ranking (
  id            bigint generated always as identity primary key,
  clave         text not null,
  valor         numeric(8,4) not null,
  motivo        text not null check (length(trim(motivo)) >= 10),
  cambiado_por  uuid references public.usuarios (id) on delete set null,
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz
);

create unique index pesos_ranking_vigente_idx
  on public.pesos_ranking (clave)
  where vigente_hasta is null;

comment on index public.pesos_ranking_vigente_idx is
  'Un solo valor vigente por peso. El historial queda en las filas cerradas.';

-- ---------------------------------------------------------------------------
-- Chatbot — conversaciones y bitácora por turno
--
-- Cada mensaje guarda el veredicto de cada capa de defensa
-- (docs/seguridad-chatbot.md) más lo que costó. Es evidencia para el informe,
-- insumo para el red team de la Fase 5 y control de gasto, en un solo lugar.
-- ---------------------------------------------------------------------------

create table public.conversaciones (
  id                uuid primary key default gen_random_uuid(),
  id_usuario        uuid not null references public.usuarios (id) on delete cascade,
  creado_en         timestamptz not null default now(),
  ultimo_mensaje_en timestamptz not null default now()
);

create index conversaciones_id_usuario_idx
  on public.conversaciones (id_usuario, ultimo_mensaje_en desc);

create table public.mensajes (
  id              bigint generated always as identity primary key,
  id_conversacion uuid not null references public.conversaciones (id) on delete cascade,
  rol             text not null check (rol in ('usuario', 'asistente')),
  contenido       text not null,

  -- Veredicto de cada capa. Null = la capa no llegó a ejecutarse porque una
  -- anterior ya había cortado.
  veredicto_capa0    text,
  categoria_intencion text,
  veredicto_capa3    text,
  bloqueado          boolean not null default false,
  motivo_bloqueo     text,

  -- Costo real, medido. docs/presupuesto.md trae la estimación; esto trae el
  -- número que va al informe.
  modelo          text,
  tokens_entrada  integer,
  tokens_salida   integer,
  tokens_cache    integer,
  costo_usd       numeric(10,6),
  latencia_ms     integer,

  -- Las noticias que la respuesta citó, para que la capa 3 pueda comprobar
  -- que existen y para poder auditar una alucinación después.
  noticias_citadas uuid[] not null default '{}',

  creado_en timestamptz not null default now()
);

create index mensajes_id_conversacion_idx on public.mensajes (id_conversacion, creado_en);
create index mensajes_bloqueado_idx on public.mensajes (creado_en desc) where bloqueado;

comment on column public.mensajes.noticias_citadas is
  'Identificadores que la respuesta citó. La capa 3 los cruza contra noticias antes de mostrar nada.';

-- ---------------------------------------------------------------------------
-- Auditoría — solo se agrega
--
-- Sin políticas de update ni de delete, y con los privilegios revocados. Una
-- bitácora que se puede editar no es una bitácora.
-- ---------------------------------------------------------------------------

create table public.auditoria (
  id          bigint generated always as identity primary key,
  ocurrido_en timestamptz not null default now(),
  id_actor    uuid references public.usuarios (id) on delete set null,
  entidad     text not null,
  id_entidad  text,
  accion      text not null,
  detalle     jsonb not null default '{}'::jsonb
);

create index auditoria_ocurrido_en_idx on public.auditoria (ocurrido_en desc);
create index auditoria_entidad_idx on public.auditoria (entidad, id_entidad);

comment on table public.auditoria is
  'Append-only. Guarda qué decidió el sistema y por qué: validaciones, cambios de estado, bloqueos del chatbot.';
