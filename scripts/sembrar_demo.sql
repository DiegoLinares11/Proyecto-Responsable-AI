-- ===========================================================================
-- Datos de demostración
--
-- Cuatro noticias con perfiles distintos y las interacciones que las rodean,
-- para poder ver el ranking funcionando y para que la Fase 3 tenga con qué
-- calibrar sus pesos.
--
-- Se corre desde el SQL Editor del dashboard de Supabase, o con
-- `npx supabase db execute --file scripts/sembrar_demo.sql`. Es idempotente:
-- correrlo dos veces no duplica nada.
--
-- Para borrarlo todo: scripts/borrar_demo.sql
--
-- ⚠ Solo para entornos de prueba. Los identificadores empiezan con `dddddddd-`
-- justamente para poder distinguirlos y borrarlos sin tocar datos reales.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Usuarios
--
-- El trigger `al_crear_usuario_de_auth` crea el perfil en `public.usuarios`
-- como lector; después se asciende a quien toca. Así se ejercita el camino real
-- en vez de insertar el perfil a mano.
-- ---------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('dddddddd-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'demo-publicador@uvg.edu.gt',
   '{"nombre":"Demo Publicador"}', now() - interval '200 days', now()),
  ('dddddddd-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'demo-moderador@uvg.edu.gt',
   '{"nombre":"Demo Moderador"}', now() - interval '200 days', now()),
  -- Un medio acreditado, con autoridad alta.
  ('dddddddd-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'demo-medio@uvg.edu.gt',
   '{"nombre":"Demo Medio Acreditado"}', now() - interval '400 days', now())
on conflict (id) do nothing;

-- Veinte lectores maduros.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select
  ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'demo-lector-' || n || '@uvg.edu.gt',
  jsonb_build_object('nombre', 'Lector Maduro ' || n),
  now() - interval '90 days', now()
from generate_series(1, 20) as n
on conflict (id) do nothing;

-- Cincuenta cuentas creadas hoy: la granja del intento de inflado.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
select
  ('dddddddd-2000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'demo-granja-' || n || '@uvg.edu.gt',
  jsonb_build_object('nombre', 'Cuenta Nueva ' || n),
  now(), now()
from generate_series(1, 50) as n
on conflict (id) do nothing;

-- La fecha de creación del perfil la pone el trigger con `now()`. El ranking
-- pondera por la antigüedad de la CUENTA, así que hay que alinearla con la de
-- `auth.users` o las cuentas maduras pesarían como recién creadas.
update public.usuarios u
set creado_en = a.created_at
from auth.users a
where a.id = u.id and u.id::text like 'dddddddd-%';

update public.usuarios
set id_rol = (select id from public.roles where clave = 'publicador')
where id in ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003');

update public.usuarios
set id_rol = (select id from public.roles where clave = 'moderador')
where id = 'dddddddd-0000-0000-0000-000000000002';

insert into public.cuentas_verificadas (id_usuario, autoridad, justificacion, otorgada_por)
values (
  'dddddddd-0000-0000-0000-000000000003', 88,
  'Demo: medio nacional con manual de estilo publico y politica de correcciones documentada.',
  'dddddddd-0000-0000-0000-000000000002'
)
on conflict (id_usuario) do nothing;

-- ---------------------------------------------------------------------------
-- Noticias
--
-- Los cuatro perfiles que interesa contrastar.
-- ---------------------------------------------------------------------------

insert into public.noticias
  (id, titulo, resumen, cuerpo, url_original, id_fuente, id_autor, estado, puntaje_veracidad, publicada_en)
values
  -- A. Bien sustentada: fuente fuerte, veracidad alta, tracción moderada.
  ('dddddddd-aaaa-0000-0000-000000000001',
   'Congreso aprueba el presupuesto general con modificaciones al gasto social',
   'El Congreso aprobo el presupuesto con cambios en las asignaciones al gasto social, segun la version publicada.',
   repeat('El Congreso aprobo el presupuesto general con modificaciones al gasto social. ', 5),
   'https://www.prensalibre.com/politica/demo-presupuesto/',
   (select id from public.fuentes where dominio = 'prensalibre.com'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 92, now() - interval '6 hours'),

  -- B. Viral apenas corroborada: mucha tracción, fuente fuera del registro,
  -- veracidad justo encima del umbral. Entra al feed, y sirve para ver que la
  -- tracción sola no le gana a una bien sustentada.
  ('dddddddd-aaaa-0000-0000-000000000002',
   'Aseguran que habra un bono extraordinario para todos los trabajadores',
   'Circula la version de un bono extraordinario para todos los trabajadores, sin confirmacion oficial disponible.',
   repeat('Circula la version de un bono extraordinario para todos los trabajadores. ', 5),
   'https://medio-desconocido-demo.info/bono',
   null,
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 76, now() - interval '3 hours'),

  -- C. Vieja pero buena: mismo perfil que A, con tres días encima.
  ('dddddddd-aaaa-0000-0000-000000000003',
   'La Corte de Constitucionalidad resuelve el amparo sobre la reforma electoral',
   'La Corte resolvio el amparo presentado contra la reforma electoral, segun la resolucion publicada esta semana.',
   repeat('La Corte de Constitucionalidad resolvio el amparo sobre la reforma electoral. ', 5),
   'https://www.prensalibre.com/politica/demo-corte/',
   (select id from public.fuentes where dominio = 'prensalibre.com'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 90, now() - interval '72 hours'),

  -- D. La víctima del inflado: fuente floja, y 50 cuentas nuevas empujándola.
  ('dddddddd-aaaa-0000-0000-000000000004',
   'Reportan una supuesta renuncia en el gabinete que nadie ha confirmado',
   'Se reporta una supuesta renuncia en el gabinete, sin que ninguna fuente oficial la haya confirmado todavia.',
   repeat('Se reporta una supuesta renuncia en el gabinete sin confirmacion oficial. ', 5),
   'https://otro-medio-demo.info/renuncia',
   null,
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 52, now() - interval '6 hours'),

  -- E. En revisión. NO entra al feed, por mucha tracción que tenga: mostrar en
  -- el feed algo que el canal de validación no dio por bueno es publicarlo. Va
  -- a la cola de moderación. Sin `publicada_en`, que es lo que exige la
  -- restricción `noticias_publicada_tiene_fecha`.
  ('dddddddd-aaaa-0000-0000-000000000005',
   'Version no confirmada sobre cambios en el gabinete de gobierno',
   'Circula una version no confirmada sobre cambios en el gabinete; el canal de validacion la dejo en revision.',
   repeat('Circula una version no confirmada sobre cambios en el gabinete de gobierno. ', 5),
   'https://tercer-medio-demo.info/gabinete',
   null,
   'dddddddd-0000-0000-0000-000000000001', 'en_revision', 55, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Interacciones
-- ---------------------------------------------------------------------------

-- A: tracción moderada de cuentas maduras, más el respaldo del medio verificado.
insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
select 'dddddddd-aaaa-0000-0000-000000000001',
       ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'reaccion', now() - (n || ' minutes')::interval
from generate_series(1, 18) as n
on conflict do nothing;

insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
values ('dddddddd-aaaa-0000-0000-000000000001',
        'dddddddd-0000-0000-0000-000000000003', 'reaccion', now() - interval '20 minutes')
on conflict do nothing;

insert into public.comentarios (id_noticia, id_usuario, contenido, creado_en)
select 'dddddddd-aaaa-0000-0000-000000000001',
       ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'Comentario de demostracion numero ' || n,
       now() - (n || ' minutes')::interval
from generate_series(1, 6) as n
on conflict do nothing;

-- B: viral. Todas las cuentas maduras reaccionan y comentan.
insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
select 'dddddddd-aaaa-0000-0000-000000000002',
       ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       t, now() - (n || ' minutes')::interval
from generate_series(1, 20) as n, unnest(array['reaccion'::public.tipo_interaccion, 'lectura']) as t
on conflict do nothing;

insert into public.comentarios (id_noticia, id_usuario, contenido, creado_en)
select 'dddddddd-aaaa-0000-0000-000000000002',
       ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'Comentario viral numero ' || n,
       now() - (n || ' minutes')::interval
from generate_series(1, 15) as n
on conflict do nothing;

-- C: la misma tracción que A. Lo único que la distingue es la antigüedad.
insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
select 'dddddddd-aaaa-0000-0000-000000000003',
       ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'reaccion', now() - interval '70 hours' - (n || ' minutes')::interval
from generate_series(1, 18) as n
on conflict do nothing;

-- E: tracción alta pero en revisión. No aparece en el feed igual.
insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
select 'dddddddd-aaaa-0000-0000-000000000005',
       ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'reaccion', now() - (n || ' minutes')::interval
from generate_series(1, 20) as n
on conflict do nothing;

-- D: el intento de inflado. 50 cuentas creadas hoy, todas en media hora.
insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
select 'dddddddd-aaaa-0000-0000-000000000004',
       ('dddddddd-2000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'reaccion', now() - ((n % 30) || ' minutes')::interval
from generate_series(1, 50) as n
on conflict do nothing;
