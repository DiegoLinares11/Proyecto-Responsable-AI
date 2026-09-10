-- ===========================================================================
-- Shim de Supabase para pruebas locales — NO ES UNA MIGRACIÓN
--
-- Reproduce lo mínimo que Supabase pone en la base y que nuestras migraciones
-- dan por hecho: el esquema `auth`, la tabla `auth.users`, las funciones
-- `auth.uid()` / `auth.role()` y los roles `anon`, `authenticated` y
-- `service_role`.
--
-- Sirve para correr las migraciones y las pruebas de RLS en un clúster
-- desechable, sin proyecto remoto y sin Docker. En el proyecto real todo esto
-- ya existe y este archivo no se aplica nunca.
--
--   scripts/probar_rls.sh lo usa. Ver también supabase/migrations/.
-- ===========================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- En Supabase, PostgREST mete los claims del JWT en este ajuste de sesión
-- antes de cada consulta. Las pruebas hacen lo mismo a mano.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', ''),
    'anon'
  );
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;

-- Supabase otorga privilegios amplios por omisión sobre lo que se crea en
-- `public`. Se reproduce aquí para que las migraciones tengan algo real que
-- revocar y la prueba no pase por un descuido del shim.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
