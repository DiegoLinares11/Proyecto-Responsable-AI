-- ===========================================================================
-- Fase 1 — Identidad, roles y permisos
--
-- Dos capas, y el orden importa (docs/plan-por-fases.md):
--
--   1. EL ROL. Un rol tiene claves de permiso. La fila decide, no un `if`.
--
--   2. EL SILENCIO. Una fila en `silencios` le quita comentar o reaccionar a
--      UNA PERSONA.
--
-- La segunda capa SOLO QUITA. No existe columna ni camino por el que un
-- silencio otorgue un permiso que el rol no tiene: en algo que gobierna
-- accesos, el peor error posible es el que abre de más, así que se hace
-- imposible por construcción y no por cuidado.
-- ===========================================================================

create type public.accion_restringible as enum ('comentar', 'reaccionar');

-- ---------------------------------------------------------------------------
-- Roles y sus claves
-- ---------------------------------------------------------------------------

create table public.roles (
  id         bigint generated always as identity primary key,
  clave      text not null unique,
  nombre     text not null,
  creado_en  timestamptz not null default now()
);

comment on table public.roles is
  'Los roles del sistema. Las claves de permiso viven en permisos_rol.';

-- La presencia de la fila ES el permiso. Deliberadamente no hay un booleano
-- `puede_acceder`: una columna así permite el estado "existe pero en false",
-- que se lee mal y se equivoca fácil.
create table public.permisos_rol (
  id            bigint generated always as identity primary key,
  id_rol        bigint not null references public.roles (id) on delete cascade,
  clave_permiso text not null,
  unique (id_rol, clave_permiso)
);

comment on table public.permisos_rol is
  'Qué claves tiene cada rol. La presencia de la fila otorga el permiso.';

-- ---------------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------------

create table public.usuarios (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null check (length(trim(nombre)) between 2 and 120),
  correo     text not null unique,
  id_rol     bigint not null references public.roles (id) on delete restrict,
  creado_en  timestamptz not null default now()
);

comment on column public.usuarios.creado_en is
  'Alimenta el peso por antigüedad de cuenta del ranking (docs/ranking-relevancia.md).';

create index usuarios_id_rol_idx on public.usuarios (id_rol);

-- ---------------------------------------------------------------------------
-- Silencios — solo quitan
-- ---------------------------------------------------------------------------

create table public.silencios (
  id           bigint generated always as identity primary key,
  id_usuario   uuid not null references public.usuarios (id) on delete cascade,
  accion       public.accion_restringible not null,
  motivo       text not null check (length(trim(motivo)) >= 10),
  impuesto_por uuid not null references public.usuarios (id) on delete restrict,
  creado_en    timestamptz not null default now(),
  vence_en     timestamptz,
  unique (id_usuario, accion),
  constraint silencios_vence_despues_de_creado check (vence_en is null or vence_en > creado_en)
);

comment on table public.silencios is
  'Le quita una acción a una persona. Nunca otorga: no hay columna que pueda hacerlo.';
comment on column public.silencios.motivo is
  'Obligatorio y de al menos 10 caracteres. Restringir a alguien deja constancia de por qué.';

create index silencios_id_usuario_idx on public.silencios (id_usuario);

-- ---------------------------------------------------------------------------
-- Cuentas verificadas — entran al ranking con peso propio
-- ---------------------------------------------------------------------------

create table public.cuentas_verificadas (
  id_usuario    uuid primary key references public.usuarios (id) on delete cascade,
  autoridad     smallint not null check (autoridad between 0 and 100),
  justificacion text not null check (length(trim(justificacion)) >= 20),
  otorgada_por  uuid not null references public.usuarios (id) on delete restrict,
  creado_en     timestamptz not null default now()
);

comment on table public.cuentas_verificadas is
  'Otorgar verificación y autoridad es poder editorial. Por eso la justificación es obligatoria (ADR 0003).';

-- ---------------------------------------------------------------------------
-- Funciones de permiso
--
-- SECURITY DEFINER a propósito: las políticas RLS las invocan, y si leyeran
-- las tablas de permisos bajo RLS se produciría recursión infinita.
-- `search_path = ''` obliga a calificar todo, que es lo que evita que alguien
-- con un esquema propio en el path secuestre la resolución de nombres.
-- ---------------------------------------------------------------------------

create or replace function public.rol_tiene_permiso(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.permisos_rol pr on pr.id_rol = u.id_rol
    where u.id = (select auth.uid())
      and pr.clave_permiso = p_clave
  );
$$;

comment on function public.rol_tiene_permiso(text) is
  'True si el rol del usuario actual tiene esa clave.';

create or replace function public.esta_silenciado(p_accion public.accion_restringible)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.silencios s
    where s.id_usuario = (select auth.uid())
      and s.accion = p_accion
      and (s.vence_en is null or s.vence_en > now())
  );
$$;

-- El `and not` es la única composición posible entre las dos capas. Si algún
-- día alguien quiere que un silencio otorgue algo, tendría que reescribir esta
-- función — y eso se ve en el diff.
create or replace function public.puede(p_accion public.accion_restringible)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.rol_tiene_permiso(
           case p_accion
             when 'comentar'   then 'noticias_comentar'
             when 'reaccionar' then 'noticias_reaccionar'
           end
         )
     and not public.esta_silenciado(p_accion);
$$;

comment on function public.puede(public.accion_restringible) is
  'El rol otorga, el silencio quita. Nunca al revés.';

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- Los roles internos que sí pueden saltarse las guardas de aplicación: las
-- migraciones y el código de servidor que corre con la llave de servicio.
create or replace function public.es_rol_de_servicio()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

-- ---------------------------------------------------------------------------
-- Alta automática del perfil al registrarse
-- ---------------------------------------------------------------------------

create or replace function public.manejar_usuario_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id_rol bigint;
begin
  select id into v_id_rol from public.roles where clave = 'lector';

  if v_id_rol is null then
    raise exception 'No existe el rol lector; las semillas no se han aplicado';
  end if;

  insert into public.usuarios (id, nombre, correo, id_rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    new.email,
    v_id_rol
  );

  return new;
end;
$$;

comment on function public.manejar_usuario_nuevo() is
  'Todo el que se registra entra como lector. Subir de rol es un acto deliberado de un administrador.';

create trigger al_crear_usuario_de_auth
  after insert on auth.users
  for each row execute function public.manejar_usuario_nuevo();

-- ---------------------------------------------------------------------------
-- Nadie se asciende solo
--
-- La política RLS de `usuarios` deja que cada quien edite su propia fila, y
-- WITH CHECK no puede comparar contra el valor anterior. Sin este trigger, un
-- usuario editaría su perfil y de paso su propio rol.
-- ---------------------------------------------------------------------------

create or replace function public.impedir_autoascenso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id_rol is distinct from old.id_rol and not public.es_rol_de_servicio() then
    raise exception 'El rol solo lo cambia un administrador desde el servidor'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'El identificador de usuario no se cambia'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger al_editar_usuario_impedir_autoascenso
  before update on public.usuarios
  for each row execute function public.impedir_autoascenso();
