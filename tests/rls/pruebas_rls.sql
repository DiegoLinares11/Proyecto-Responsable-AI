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
    when insufficient_privilege or check_violation or unique_violation then
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

reset role;

\echo ''
\echo '=== todas las pruebas pasaron ==='
