-- ===========================================================================
-- Fase 1 — Sacar las funciones internas de la superficie de API
--
-- Los advisors de Supabase señalaron que `rol_tiene_permiso`,
-- `esta_silenciado`, `puede` y `manejar_usuario_nuevo` quedaban llamables por
-- `anon` y `authenticated` en `/rest/v1/rpc/<nombre>`. Ninguna está pensada
-- para eso: existen para que las evalúen las políticas de fila, y las de
-- trigger para que las dispare el motor. PostgREST publica como RPC toda
-- función del esquema `public` que el rol pueda ejecutar, así que estaban
-- publicadas por estar donde estaban.
--
-- El primer intento fue revocar el EXECUTE. NO FUNCIONA, y conviene que quede
-- escrito: PostgreSQL verifica el permiso de las funciones que una política
-- invoca contra el usuario que hace la consulta, no contra el dueño de la
-- tabla. Al revocarlo, todas las políticas empezaron a fallar con
-- "permission denied for function rol_tiene_permiso" y la suite de
-- tests/rls/ se cayó en la segunda aserción. Es exactamente para lo que sirve
-- tener la suite.
--
-- Lo que sí funciona es mover las funciones a un esquema que PostgREST no
-- expone. Los permisos se quedan como estaban —las políticas los necesitan— y
-- lo que desaparece es la publicación: sin `interno` en la lista de esquemas
-- expuestos, no hay ruta de RPC que llegue.
-- ===========================================================================

create schema if not exists interno;

comment on schema interno is
  'Funciones que solo usan las políticas de fila y los triggers. Fuera de `public` a propósito: PostgREST no lo expone, así que nada de aquí es API.';

-- `alter ... set schema` conserva el OID, y las políticas guardan el OID y no
-- el nombre. Por eso siguen funcionando sin tocar el archivo de RLS.
-- Recrearlas con `drop` + `create` habría exigido `cascade`, que se habría
-- llevado las políticas con él.

alter function public.rol_tiene_permiso(text)                      set schema interno;
alter function public.esta_silenciado(public.accion_restringible)  set schema interno;
alter function public.puede(public.accion_restringible)            set schema interno;
alter function public.es_rol_de_servicio()                         set schema interno;
alter function public.manejar_usuario_nuevo()                      set schema interno;
alter function public.tocar_actualizado_en()                        set schema interno;
alter function public.impedir_autoascenso()                        set schema interno;
alter function public.impedir_edicion_de_ranking()                 set schema interno;

-- Mover una función no reescribe su cuerpo, y tres de ellas llaman a otras por
-- nombre calificado. Sin esto quedarían apuntando a un `public.` que ya no
-- existe, y fallarían en tiempo de ejecución — no al aplicar la migración.
-- `create or replace` mantiene el OID, así que las políticas siguen intactas.

create or replace function interno.puede(p_accion public.accion_restringible)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select interno.rol_tiene_permiso(
           case p_accion
             when 'comentar'   then 'noticias_comentar'
             when 'reaccionar' then 'noticias_reaccionar'
           end
         )
     and not interno.esta_silenciado(p_accion);
$$;

create or replace function interno.impedir_autoascenso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id_rol is distinct from old.id_rol and not interno.es_rol_de_servicio() then
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

create or replace function interno.impedir_edicion_de_ranking()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if interno.es_rol_de_servicio() then
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

-- Los permisos quedan como estaban, porque las políticas los necesitan. Lo que
-- cambió es que ahora hace falta atravesar el esquema, y eso solo lo puede
-- `authenticated`. `anon` no recibe USAGE, así que aunque conserve el EXECUTE
-- que PostgreSQL otorga a `public` en toda función nueva, no llega.
grant usage on schema interno to authenticated, service_role;
grant execute on all functions in schema interno to authenticated, service_role;

revoke all on schema interno from anon;

-- Nota: `public.rls_auto_enable()` también aparece en los advisors, pero es de
-- Supabase — respalda el event trigger `ensure_rls`, que enciende RLS en las
-- tablas nuevas de `public`. No se toca.
