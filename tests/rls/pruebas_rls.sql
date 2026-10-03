-- ===========================================================================
-- Pruebas de las políticas de fila — Fase 1
--
-- Comprueban el criterio de aceptación de docs/plan-por-fases.md: que las
-- reglas aguanten a alguien que llama a la base directamente con su propio
-- token, sin pasar por la aplicación.
--
-- Cada prueba se ejecuta con el rol `authenticated` y con los claims del JWT
-- puestos a mano, que es exactamente lo que hace PostgREST en producción.
--
--   scripts/probar_rls.sh las corre contra un clúster desechable.
-- ===========================================================================

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages to notice;

-- Los resultados de la suite salen por NOTICE. Los `select` a los auxiliares
-- devuelven void, así que sus encabezados de columna solo son ruido.
\pset tuples_only on
\pset format unaligned

-- ---------------------------------------------------------------------------
-- Auxiliares. Se crean como superusuario, antes de bajar de privilegios.
--
-- `debe_fallar` solo acepta como bloqueo legítimo los códigos que significan
-- "la regla te paró": privilegio insuficiente, violación de CHECK, violación
-- de unicidad y el 42501 que levantan nuestros triggers. Cualquier otro error
-- se vuelve a lanzar, para que un typo en la prueba no se lea como un éxito.
-- ---------------------------------------------------------------------------

create or replace function pg_temp.debe_fallar(p_sql text, p_etiqueta text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception
    -- foreign_key_violation: una referencia a algo que no existe (una zona
    -- inventada) es un rechazo legitimo de la base, no un error de la prueba.
    when insufficient_privilege or check_violation or unique_violation or foreign_key_violation then
      raise notice 'OK      %', p_etiqueta;
      return;
    when others then
      raise exception 'ERROR EN LA PRUEBA  %  -> % / %', p_etiqueta, sqlstate, sqlerrm;
  end;
  raise exception 'FALLA   %  -> la operacion fue PERMITIDA y no debia', p_etiqueta;
end;
$$;

create or replace function pg_temp.debe_pasar(p_sql text, p_etiqueta text)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  raise notice 'OK      %', p_etiqueta;
exception
  when others then
    raise exception 'FALLA   %  -> fue BLOQUEADA y debia pasar (% / %)', p_etiqueta, sqlstate, sqlerrm;
end;
$$;

-- Un `update` o un `delete` que no alcanza ninguna fila por RLS NO lanza
-- error: simplemente afecta cero filas. Solo el `insert` y el `with check`
-- levantan excepción. Es una distinción con consecuencias — código que asuma
-- "no hubo error, entonces se guardó" tiene un fallo silencioso — así que la
-- suite la comprueba con su propio auxiliar en vez de esperar una excepción
-- que nunca va a llegar.
create or replace function pg_temp.debe_no_afectar_filas(p_sql text, p_etiqueta text)
returns void
language plpgsql
as $$
declare
  v_filas bigint;
begin
  execute p_sql;
  get diagnostics v_filas = row_count;

  if v_filas <> 0 then
    raise exception 'FALLA   %  -> afecto % fila(s) y no debia tocar ninguna', p_etiqueta, v_filas;
  end if;

  raise notice 'OK      % (0 filas afectadas)', p_etiqueta;
exception
  when insufficient_privilege or check_violation then
    raise notice 'OK      % (bloqueado con error)', p_etiqueta;
end;
$$;

create or replace function pg_temp.debe_contar(p_sql text, p_esperado bigint, p_etiqueta text)
returns void
language plpgsql
as $$
declare
  v_real bigint;
begin
  execute p_sql into v_real;
  if v_real is distinct from p_esperado then
    raise exception 'FALLA   %  -> esperaba % y obtuvo %', p_etiqueta, p_esperado, v_real;
  end if;
  raise notice 'OK      %', p_etiqueta;
end;
$$;

create or replace function pg_temp.entrar_como(p_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text,
    false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------------

\echo ''
\echo '--- montando escenario ---'

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'lector@uvg.edu.gt',     '{"nombre":"Ana Lectora"}'),
  ('22222222-2222-2222-2222-222222222222', 'publicador@uvg.edu.gt', '{"nombre":"Beto Publicador"}'),
  ('33333333-3333-3333-3333-333333333333', 'moderador@uvg.edu.gt',  '{"nombre":"Carla Moderadora"}'),
  ('44444444-4444-4444-4444-444444444444', 'callado@uvg.edu.gt',    '{"nombre":"Dani Silenciado"}');

-- El trigger de alta debio crear los cuatro perfiles como lectores.
select pg_temp.debe_contar(
  'select count(*) from public.usuarios',
  4, 'el alta automatica creo los 4 perfiles');

select pg_temp.debe_contar(
  'select count(*) from public.usuarios u join public.roles r on r.id = u.id_rol where r.clave = ''lector''',
  4, 'todos entran como lector, nadie nace con privilegios');

update public.usuarios set id_rol = (select id from public.roles where clave = 'publicador')
  where id = '22222222-2222-2222-2222-222222222222';
update public.usuarios set id_rol = (select id from public.roles where clave = 'moderador')
  where id = '33333333-3333-3333-3333-333333333333';
update public.usuarios set id_rol = (select id from public.roles where clave = 'publicador')
  where id = '44444444-4444-4444-4444-444444444444';

-- A Dani le quitaron comentar.
insert into public.silencios (id_usuario, accion, motivo, impuesto_por)
values ('44444444-4444-4444-4444-444444444444', 'comentar',
        'Prueba: se le retira comentar para verificar que la capa de silencios quita de verdad',
        '33333333-3333-3333-3333-333333333333');

-- ===========================================================================
-- 1. Publicar: el criterio de aceptación de la fase
-- ===========================================================================

\echo ''
\echo '--- 1. quien puede publicar ---'

set role authenticated;
select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');

select pg_temp.debe_fallar($q$
  insert into public.noticias (titulo, resumen, cuerpo, id_autor, id_fuente)
  values ('Titular de prueba del lector',
          'Un resumen suficientemente largo para pasar la restriccion de longitud.',
          repeat('Cuerpo de la noticia de prueba. ', 5),
          '11111111-1111-1111-1111-111111111111',
          (select id from public.fuentes where dominio = 'prensalibre.com'))
$q$, 'un lector NO puede insertar una noticia');

select pg_temp.entrar_como('22222222-2222-2222-2222-222222222222');

select pg_temp.debe_pasar($q$
  insert into public.noticias (id, titulo, resumen, cuerpo, id_autor, id_fuente)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          'Titular valido escrito por el publicador',
          'Un resumen suficientemente largo para pasar la restriccion de longitud.',
          repeat('Cuerpo de la noticia de prueba. ', 5),
          '22222222-2222-2222-2222-222222222222',
          (select id from public.fuentes where dominio = 'prensalibre.com'))
$q$, 'un publicador SI puede insertar, y nace como borrador');

-- La trampa evidente: publicarse a uno mismo saltandose la validacion.
select pg_temp.debe_fallar($q$
  insert into public.noticias (titulo, resumen, cuerpo, id_autor, estado, publicada_en)
  values ('Titular que intenta auto-aprobarse',
          'Un resumen suficientemente largo para pasar la restriccion de longitud.',
          repeat('Cuerpo de la noticia de prueba. ', 5),
          '22222222-2222-2222-2222-222222222222',
          'verificada', now())
$q$, 'un publicador NO puede insertar ya como verificada');

-- La trampa menos evidente: publicar a nombre de otro.
select pg_temp.debe_fallar($q$
  insert into public.noticias (titulo, resumen, cuerpo, id_autor)
  values ('Titular firmado por alguien mas',
          'Un resumen suficientemente largo para pasar la restriccion de longitud.',
          repeat('Cuerpo de la noticia de prueba. ', 5),
          '33333333-3333-3333-3333-333333333333')
$q$, 'nadie puede publicar a nombre de otro');

-- ===========================================================================
-- 2. El estado y el puntaje no los mueve el autor
-- ===========================================================================

\echo ''
\echo '--- 2. el autor no se aprueba solo ---'

select pg_temp.debe_fallar($q$
  update public.noticias set estado = 'verificada', publicada_en = now()
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'el autor NO puede mover su noticia a verificada');

select pg_temp.debe_fallar($q$
  update public.noticias set relevancia = 99999
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'el autor NO puede escribir su propia relevancia');

select pg_temp.debe_fallar($q$
  update public.noticias set puntaje_veracidad = 100
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'el autor NO puede escribir su propio puntaje de veracidad');

select pg_temp.debe_pasar($q$
  update public.noticias set titulo = 'Titular corregido por su autor'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'el autor SI puede corregir el texto de su borrador');

-- ===========================================================================
-- 3. Nadie se asciende solo
-- ===========================================================================

\echo ''
\echo '--- 3. escalada de privilegios ---'

select pg_temp.debe_fallar($q$
  update public.usuarios
  set id_rol = (select id from public.roles where clave = 'administrador')
  where id = '22222222-2222-2222-2222-222222222222'
$q$, 'un usuario NO puede cambiarse el rol');

select pg_temp.debe_pasar($q$
  update public.usuarios set nombre = 'Beto Publicador Editado'
  where id = '22222222-2222-2222-2222-222222222222'
$q$, 'un usuario SI puede cambiarse el nombre');

select pg_temp.debe_no_afectar_filas($q$
  update public.usuarios set nombre = 'Nombre ajeno'
  where id = '11111111-1111-1111-1111-111111111111'
$q$, 'un usuario NO puede editar el perfil de otro');

select pg_temp.debe_contar(
  $q$select count(*) from public.usuarios
     where id = '11111111-1111-1111-1111-111111111111' and nombre = 'Ana Lectora'$q$,
  1, 'el perfil ajeno quedo intacto');

select pg_temp.debe_fallar(
  'select correo from public.usuarios limit 1',
  'el correo NO es legible desde el cliente');

-- ===========================================================================
-- 4. Visibilidad de borradores
-- ===========================================================================

\echo ''
\echo '--- 4. los borradores ajenos no se leen ---'

select pg_temp.debe_contar(
  $q$select count(*) from public.noticias where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  1, 'el autor ve su propio borrador');

select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
select pg_temp.debe_contar(
  $q$select count(*) from public.noticias where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  0, 'un lector NO ve el borrador ajeno');

select pg_temp.entrar_como('33333333-3333-3333-3333-333333333333');
select pg_temp.debe_contar(
  $q$select count(*) from public.noticias where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  1, 'un moderador SI ve el borrador ajeno');

-- ===========================================================================
-- 5. El moderador si puede verificar
-- ===========================================================================

\echo ''
\echo '--- 5. el moderador mueve el estado ---'

select pg_temp.debe_pasar($q$
  update public.noticias set estado = 'verificada', publicada_en = now()
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'un moderador SI puede verificar una noticia');

select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
select pg_temp.debe_contar(
  $q$select count(*) from public.noticias where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$,
  1, 'ya verificada, el lector SI la ve');

-- ===========================================================================
-- 6. El rol otorga, el silencio quita
-- ===========================================================================

\echo ''
\echo '--- 6. silencios ---'

select pg_temp.debe_pasar($q$
  insert into public.comentarios (id_noticia, id_usuario, contenido)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          '11111111-1111-1111-1111-111111111111',
          'Un lector sin silencio si puede comentar.')
$q$, 'un lector sin silencio SI comenta');

select pg_temp.entrar_como('44444444-4444-4444-4444-444444444444');

select pg_temp.debe_fallar($q$
  insert into public.comentarios (id_noticia, id_usuario, contenido)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          '44444444-4444-4444-4444-444444444444',
          'Este comentario no deberia entrar.')
$q$, 'un usuario silenciado NO puede comentar');

-- El silencio es por accion: le quitaron comentar, no reaccionar.
select pg_temp.debe_pasar($q$
  insert into public.interacciones (id_noticia, id_usuario, tipo)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          '44444444-4444-4444-4444-444444444444', 'reaccion')
$q$, 'el silencio es por accion: silenciado de comentar SI reacciona');

-- El tope anti-manipulacion del ranking, en la base y no en el codigo.
select pg_temp.debe_fallar($q$
  insert into public.interacciones (id_noticia, id_usuario, tipo)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          '44444444-4444-4444-4444-444444444444', 'reaccion')
$q$, 'nadie reacciona dos veces a la misma noticia');

-- ===========================================================================
-- 7. La bitacora no la escribe el auditado
-- ===========================================================================

\echo ''
\echo '--- 7. auditoria y bitacora del chatbot ---'

select pg_temp.debe_fallar($q$
  insert into public.auditoria (entidad, accion) values ('noticias', 'inventada')
$q$, 'nadie escribe en auditoria desde el cliente');

select pg_temp.debe_fallar(
  'delete from public.auditoria',
  'nadie borra la auditoria desde el cliente');

select pg_temp.debe_fallar($q$
  insert into public.conversaciones (id_usuario)
  values ('44444444-4444-4444-4444-444444444444')
$q$, 'el cliente NO fabrica conversaciones del chatbot');

-- Aquí sí hay privilegio de `select`: lo que corta es la política, y una
-- política que no deja pasar ninguna fila devuelve cero, no un error. Se
-- siembra una entrada con la llave de servicio, que es quien escribe la
-- bitácora en producción.
reset role;
insert into public.auditoria (entidad, accion) values ('noticias', 'verificada');
set role authenticated;

select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
select pg_temp.debe_contar(
  'select count(*) from public.auditoria',
  0, 'un lector NO lee la auditoria');

select pg_temp.entrar_como('33333333-3333-3333-3333-333333333333');
select pg_temp.debe_contar(
  'select count(*) from public.auditoria',
  1, 'un moderador SI lee la auditoria');

-- ===========================================================================
-- 8. Transparencia: la formula del ranking es publica (ADR 0003)
-- ===========================================================================

\echo ''
\echo '--- 8. transparencia ---'

select pg_temp.debe_contar(
  'select count(*) from public.pesos_ranking where vigente_hasta is null',
  5, 'cualquier usuario puede leer los 5 pesos vigentes');

select pg_temp.debe_contar(
  'select count(*) from public.fuentes',
  9, 'cualquier usuario puede leer el registro de fuentes con su justificacion');

-- ===========================================================================
-- 9. Las funciones internas no son API
--
-- PostgREST publica como RPC toda funcion de `public` que el rol pueda
-- ejecutar. Estas cuatro existen para que las evalúen las políticas, no para
-- que las llame un cliente. Las pruebas de arriba ya demostraron que las
-- políticas siguen funcionando después de revocar el permiso: si revocarlo las
-- hubiera roto, la suite entera habría fallado antes de llegar aquí.
-- ===========================================================================

\echo ''
\echo '# 9. superficie de RPC'

-- Lo que PostgREST publica es lo que vive en `public`. Que ahí no quede
-- ninguna de nuestras funciones es la aserción que cierra el hallazgo de los
-- advisors. (`rls_auto_enable` es de Supabase y no existe en el shim local.)
select pg_temp.debe_contar($q$
  select count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname <> 'rls_auto_enable'
$q$, 0, 'no queda ninguna funcion nuestra en el esquema publicado');

select pg_temp.debe_contar($q$
  select count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'interno'
$q$, 9, 'las 9 funciones viven en el esquema interno (la novena sella el descarte de alertas)');

-- Y que el esquema interno no se pueda atravesar sin haber iniciado sesion.
select pg_temp.debe_contar(
  $q$select count(*) where has_schema_privilege('anon', 'interno', 'USAGE')$q$,
  0, 'anon NO puede atravesar el esquema interno');

select pg_temp.debe_contar(
  $q$select count(*) where has_schema_privilege('authenticated', 'interno', 'USAGE')$q$,
  1, 'authenticated SI puede, que es lo que las politicas necesitan');

-- ===========================================================================
-- 10. Las vistas del ranking no son API
--
-- Una vista de `public` que el rol pueda leer la publica PostgREST. Estas dos
-- existen para el trabajo que recalcula el feed, que corre con la llave de
-- servicio.
--
-- Y van con `security_invoker`. Sin eso, una vista corre con los permisos de su
-- dueño y se salta las políticas de fila de las tablas que consulta: un agujero
-- que además no se ve, porque la vista funciona — solo muestra de más.
-- ===========================================================================

\echo ''
\echo '# 10. vistas del ranking'

select pg_temp.debe_fallar(
  'select count(*) from public.vista_noticias_ranking',
  'authenticated NO puede leer la vista de noticias del ranking');

select pg_temp.debe_fallar(
  'select count(*) from public.vista_interacciones_ranking',
  'authenticated NO puede leer la vista de interacciones del ranking');

reset role;

select pg_temp.debe_contar($q$
  select count(*)
  from pg_views v
  join pg_class c on c.relname = v.viewname and c.relkind = 'v'
  where v.schemaname = 'public'
    and v.viewname like 'vista_%_ranking'
    and exists (
      select 1 from pg_options_to_table(c.reloptions)
      where option_name = 'security_invoker' and option_value = 'true'
    )
$q$, 2, 'las 2 vistas tienen security_invoker activo');

-- ===========================================================================
-- 11. Lectura pública: qué ve un visitante SIN cuenta
--
-- La superficie de `anon` es la más expuesta que tiene el proyecto: cualquiera
-- en internet con la llave publicable —que por diseño va en el navegador— puede
-- consultar exactamente esto. Cada fila de aquí abajo es una afirmación sobre
-- lo que el mundo puede leer.
-- ===========================================================================

\echo ''
\echo '# 11. lo que ve un visitante sin cuenta'

reset role;

-- Una noticia de cada estado, para poder comprobar qué atraviesa la política.
update public.noticias set estado = 'verificada', publicada_en = now()
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.noticias (id, titulo, resumen, cuerpo, id_autor, estado)
values ('aaaaaaaa-0000-0000-0000-000000000009',
        'Borrador que nadie de afuera deberia ver',
        'Resumen de un borrador que sirve para comprobar la politica de lectura publica.',
        repeat('Cuerpo del borrador de prueba. ', 5),
        '22222222-2222-2222-2222-222222222222', 'borrador')
on conflict (id) do nothing;

set role anon;

select pg_temp.debe_contar(
  $q$select count(*) from public.noticias$q$,
  1, 'un visitante sin cuenta ve SOLO la noticia verificada');

select pg_temp.debe_contar(
  $q$select count(*) from public.noticias where estado <> 'verificada'$q$,
  0, 'no ve borradores ni nada en moderacion');

select pg_temp.debe_contar(
  'select count(*) from public.fuentes',
  9, 'si ve el registro de fuentes: la transparencia es parte del producto');

select pg_temp.debe_contar(
  'select count(*) from public.pesos_ranking where vigente_hasta is null',
  5, 'si ve los pesos del ranking, por la misma razon');

-- Lo que NO puede ver. Sin privilegio otorgado, la consulta ni siquiera corre.
select pg_temp.debe_fallar('select count(*) from public.usuarios',
  'no ve la tabla de usuarios');
select pg_temp.debe_fallar('select count(*) from public.mensajes',
  'no ve las conversaciones del chatbot');
select pg_temp.debe_fallar('select count(*) from public.auditoria',
  'no ve la bitacora de auditoria');
select pg_temp.debe_fallar('select count(*) from public.interacciones',
  'no ve quien reacciono a que');
select pg_temp.debe_fallar('select count(*) from public.comentarios',
  'no ve los comentarios');
select pg_temp.debe_fallar('select count(*) from public.silencios',
  'no ve a quien se le quito una accion');

-- Y lo que no puede hacer.
select pg_temp.debe_fallar($q$
  insert into public.noticias (titulo, resumen, cuerpo, id_autor)
  values ('Titular inyectado por un visitante',
          'Un resumen suficientemente largo para pasar la restriccion de longitud.',
          repeat('Cuerpo de prueba. ', 10),
          '22222222-2222-2222-2222-222222222222')
$q$, 'un visitante sin cuenta NO puede publicar');

select pg_temp.debe_no_afectar_filas(
  $q$update public.noticias set titulo = 'Titular cambiado desde afuera'$q$,
  'un visitante sin cuenta NO puede editar noticias');

select pg_temp.debe_fallar(
  $q$select count(*) from public.vista_noticias_ranking$q$,
  'tampoco llega a las vistas internas del ranking');

reset role;

-- ===========================================================================
-- 12. El tope de gasto
--
-- La vista que el chatbot consulta antes de cada turno. Dos cosas que importan:
-- que sume solo el gasto real de API —los costos del modo suscripción son
-- estimados del SDK, no dinero pagado— y que nadie fuera del servidor pueda
-- leer cuánto lleva gastado el proyecto.
-- ===========================================================================

\echo ''
\echo '# 12. el tope de gasto'

reset role;

insert into public.conversaciones (id, id_usuario)
values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');

insert into public.mensajes (id_conversacion, rol, contenido, modelo, costo_usd) values
  ('cccccccc-0000-0000-0000-000000000001', 'asistente', 'turno por API',             'claude-sonnet-5',  0.011),
  ('cccccccc-0000-0000-0000-000000000001', 'asistente', 'clasificado y negado',      'claude-haiku-4-5', 0.0004),
  ('cccccccc-0000-0000-0000-000000000001', 'asistente', 'turno en modo suscripcion', 'suscripcion',      0.15),
  ('cccccccc-0000-0000-0000-000000000001', 'asistente', 'cortado en capa 0',         null,               0),
  ('cccccccc-0000-0000-0000-000000000001', 'usuario',   'mensaje del usuario',       null,               null);

select pg_temp.debe_contar(
  $q$select (gasto_usd * 10000)::bigint from public.vista_gasto_api$q$,
  114, 'suma solo el gasto real de API: 0.011 + 0.0004, sin los 0.15 estimados de suscripcion');

select pg_temp.debe_contar(
  $q$select turnos from public.vista_gasto_api$q$,
  2, 'cuenta solo los turnos que pasaron por la API');

select pg_temp.debe_contar($q$
  select count(*) from pg_class c
  where c.relname = 'vista_gasto_api' and c.relkind = 'v'
    and exists (
      select 1 from pg_options_to_table(c.reloptions)
      where option_name = 'security_invoker' and option_value = 'true'
    )
$q$, 1, 'la vista del gasto tiene security_invoker activo');

select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
set role authenticated;

select pg_temp.debe_fallar('select gasto_usd from public.vista_gasto_api',
  'un usuario con sesion NO ve cuanto lleva gastado el proyecto');

reset role;
set role anon;

select pg_temp.debe_fallar('select gasto_usd from public.vista_gasto_api',
  'un visitante sin cuenta tampoco');

reset role;

-- ===========================================================================
-- 13. La portada: la imagen viaja entera o no viaja
--
-- Las tres condiciones de la foto viven en la base y no en el formulario,
-- porque el formulario no es el único camino hasta la tabla: este script de
-- pruebas es otro, y el script de validación es un tercero.
-- ===========================================================================

\echo ''
\echo '# 13. la portada'

reset role;

select pg_temp.debe_fallar($q$
  update public.noticias set url_imagen = 'https://ejemplo.org/foto.jpg'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'una imagen sin credito ni texto alterno NO entra');

select pg_temp.debe_fallar($q$
  update public.noticias
     set url_imagen = 'https://ejemplo.org/foto.jpg',
         credito_imagen = 'Fotografia: alguien'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'con credito pero sin texto alterno tampoco: quien usa lector de pantalla se queda afuera');

select pg_temp.debe_fallar($q$
  update public.noticias
     set url_imagen = 'http://ejemplo.org/foto.jpg',
         credito_imagen = 'Fotografia: alguien',
         texto_alterno_imagen = 'Lo que se ve en la foto'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'una imagen por http NO entra, aunque traiga todo lo demas');

select pg_temp.debe_pasar($q$
  update public.noticias
     set url_imagen = 'https://ejemplo.org/foto.jpg',
         credito_imagen = 'Fotografia: alguien',
         texto_alterno_imagen = 'Lo que se ve en la foto'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'con https, credito y texto alterno SI entra');

select pg_temp.debe_contar(
  $q$select count(*) from public.noticias where seccion = 'general' and id = 'aaaaaaaa-0000-0000-0000-000000000009'$q$,
  1, 'una noticia sin seccion queda en general: no se le inventa una');

-- ===========================================================================
-- 14. Alertas de contenido
--
-- Las escribe el sistema cuando una noticia intenta manipular al chatbot. Lo
-- que se comprueba: que nadie del cliente las fabrique, que solo un moderador
-- las vea, y que descartarlas sea una decisión con nombre, fecha y motivo que
-- no se puede falsificar ni reescribir.
-- ===========================================================================

\echo ''
\echo '# 14. alertas de contenido'

reset role;

insert into public.alertas_de_contenido (id, id_noticia, comprobacion, evidencia)
overriding system value
values (900001, 'aaaaaaaa-0000-0000-0000-000000000001', 'sin_dominios_ajenos', 'ejemplo-malicioso.com');

-- Un lector.
select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
set role authenticated;

select pg_temp.debe_contar('select count(*) from public.alertas_de_contenido',
  0, 'un lector NO ve las alertas');

select pg_temp.debe_fallar($q$
  insert into public.alertas_de_contenido (id_noticia, comprobacion, evidencia)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'sin_dominios_ajenos', 'inventada.com')
$q$, 'nadie del cliente fabrica una alerta');

select pg_temp.debe_no_afectar_filas($q$
  update public.alertas_de_contenido
     set descartada_por = '11111111-1111-1111-1111-111111111111',
         motivo_descarte = 'Un lector intentando tapar la alerta'
$q$, 'un lector NO puede descartar una alerta');

reset role;

-- Un moderador.
select pg_temp.entrar_como('33333333-3333-3333-3333-333333333333');
set role authenticated;

select pg_temp.debe_contar('select count(*) from public.alertas_de_contenido',
  1, 'un moderador SI ve la alerta');

select pg_temp.debe_fallar($q$
  update public.alertas_de_contenido
     set descartada_por = '22222222-2222-2222-2222-222222222222',
         motivo_descarte = 'Descartada a nombre de otra persona'
   where id = 900001
$q$, 'un moderador NO puede descartar a nombre de otro');

select pg_temp.debe_fallar($q$
  update public.alertas_de_contenido
     set descartada_en = now() - interval '30 days'
   where id = 900001
$q$, 'nadie del cliente escribe la fecha del descarte');

select pg_temp.debe_fallar($q$
  update public.alertas_de_contenido
     set evidencia = 'otra-cosa.com'
   where id = 900001
$q$, 'nadie del cliente reescribe la evidencia');

select pg_temp.debe_pasar($q$
  update public.alertas_de_contenido
     set descartada_por = '33333333-3333-3333-3333-333333333333',
         motivo_descarte = 'La noticia cita el sitio oficial del ministerio; no es una orden'
   where id = 900001
$q$, 'un moderador SI descarta, a su nombre y con motivo');

select pg_temp.debe_contar($q$
  select count(*) from public.alertas_de_contenido
  where id = 900001 and descartada_en is not null
$q$, 1, 'la fecha del descarte la puso el motor');

select pg_temp.debe_no_afectar_filas($q$
  update public.alertas_de_contenido
     set motivo_descarte = 'Cambio el motivo despues de la decision'
   where id = 900001
$q$, 'un descarte ya hecho NO se reescribe');

reset role;
set role anon;

select pg_temp.debe_fallar('select count(*) from public.alertas_de_contenido',
  'un visitante sin cuenta no llega a las alertas');

reset role;

-- ===========================================================================
-- 15. Ubicación simulada y alcance geográfico
--
-- La lista de ubicaciones es pública y cerrada. El alcance de una noticia
-- obliga a declarar de dónde es. Y la ubicación de cada usuario es solo suya:
-- ni otro usuario ni un moderador la ven, porque moderar noticias no requiere
-- saber dónde dice estar alguien.
-- ===========================================================================

\echo ''
\echo '# 15. ubicacion simulada y alcance'

reset role;
set role anon;

select pg_temp.debe_contar('select count(*) from public.ubicaciones',
  27, 'cualquiera ve la lista de ubicaciones: 22 departamentos y 5 paises');

select pg_temp.debe_fallar($q$
  insert into public.ubicaciones (id, nombre, pais, tipo) values ('GT-XX', 'Inventada', 'GT', 'departamento')
$q$, 'nadie del cliente agrega ubicaciones');

select pg_temp.debe_fallar('select count(*) from public.preferencias_usuario',
  'un visitante sin cuenta no llega a las preferencias');

reset role;

-- La regla del alcance vive en la base, no en el formulario.
select pg_temp.debe_fallar($q$
  update public.noticias set alcance = 'local', id_ubicacion = null
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'una noticia local sin zona NO entra');

select pg_temp.debe_fallar($q$
  update public.noticias set alcance = 'nacional', pais = null
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'una noticia nacional sin pais NO entra');

select pg_temp.debe_fallar($q$
  update public.noticias set alcance = 'local', id_ubicacion = 'GT-XX'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'una zona que no esta en la lista NO entra');

select pg_temp.debe_pasar($q$
  update public.noticias set alcance = 'local', id_ubicacion = 'GT-QZ'
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'
$q$, 'una noticia local de Quetzaltenango SI entra');

-- Cada quien su fila.
select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
set role authenticated;

select pg_temp.debe_pasar($q$
  insert into public.preferencias_usuario (id_usuario, id_ubicacion)
  values ('11111111-1111-1111-1111-111111111111', 'GT-PE')
$q$, 'un usuario guarda su propia ubicacion');

select pg_temp.debe_fallar($q$
  insert into public.preferencias_usuario (id_usuario, id_ubicacion)
  values ('22222222-2222-2222-2222-222222222222', 'GT-PE')
$q$, 'nadie guarda la ubicacion de otro');

select pg_temp.debe_pasar($q$
  update public.preferencias_usuario set intereses_desde = now()
   where id_usuario = '11111111-1111-1111-1111-111111111111'
$q$, 'un usuario reinicia sus intereses');

reset role;
select pg_temp.entrar_como('22222222-2222-2222-2222-222222222222');
set role authenticated;

select pg_temp.debe_contar('select count(*) from public.preferencias_usuario',
  0, 'otro usuario NO ve la ubicacion ajena');

select pg_temp.debe_no_afectar_filas($q$
  update public.preferencias_usuario set id_ubicacion = 'GT-GU'
   where id_usuario = '11111111-1111-1111-1111-111111111111'
$q$, 'otro usuario NO cambia la ubicacion ajena');

reset role;
select pg_temp.entrar_como('33333333-3333-3333-3333-333333333333');
set role authenticated;

select pg_temp.debe_contar('select count(*) from public.preferencias_usuario',
  0, 'un moderador tampoco ve ubicaciones ajenas');

reset role;

\echo ''
\echo '=== todas las pruebas pasaron ==='
