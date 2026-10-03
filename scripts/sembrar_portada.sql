-- ===========================================================================
-- Noticias de demostración para llenar la portada
--
-- Va aparte de `sembrar_demo.sql` a propósito. Ese archivo es el fixture con el
-- que se calibraron los pesos del ranking en la Fase 3: sus cinco noticias
-- tienen perfiles elegidos (bien sustentada, viral apenas corroborada, vieja
-- pero buena, víctima de inflado, en revisión) y agregarle notas cambiaría
-- contra qué se calibró. Esto es decorado para la portada; aquello es una
-- medición.
--
-- Se corre después de `sembrar_demo.sql`, porque reusa sus usuarios y sus
-- fuentes. Después hay que recalcular:
--
--   node scripts/sembrar_portada.sql   (desde el SQL Editor, o con sbq)
--   node scripts/recalcular_ranking.mjs
--
-- ⚠ Solo para entornos de prueba.
--
-- Sobre el contenido: los titulares son genéricos y no mencionan a ninguna
-- persona real. Son relleno para ver una portada con volumen, no un simulacro
-- de reportería — inventar notas específicas y atribuírselas a medios que
-- existen sería justo lo que esta plataforma dice combatir. Por lo mismo, las
-- fotos llevan crédito que dice que son de demostración.
-- ===========================================================================

insert into public.noticias
  (id, titulo, resumen, cuerpo, url_original, id_fuente, id_autor, estado,
   puntaje_veracidad, publicada_en, seccion,
   url_imagen, credito_imagen, texto_alterno_imagen)
values
  -- Internacional, fuente de máxima credibilidad y publicada hace poco: es la
  -- candidata natural a encabezar la portada.
  ('dddddddd-aaaa-0000-0000-000000000011',
   'Las principales economias acuerdan una hoja de ruta para reducir emisiones',
   'Los paises participantes publicaron un calendario de metas intermedias y un mecanismo de revision anual.',
   repeat('Los paises participantes acordaron una hoja de ruta con metas intermedias y revision anual. ', 5),
   'https://www.reuters.com/demo/hoja-de-ruta-emisiones/',
   (select id from public.fuentes where dominio = 'reuters.com'),
   'dddddddd-0000-0000-0000-000000000003', 'verificada', 94, now() - interval '2 hours', 'mundo',
   'https://picsum.photos/seed/cumbre/1200/675',
   'Imagen de demostracion - Lorem Picsum',
   'Fotografia generica de archivo usada como marcador en los datos de prueba'),

  ('dddddddd-aaaa-0000-0000-000000000012',
   'El banco central mantiene la tasa de interes sin cambios por tercer mes',
   'La decision se tomo por unanimidad y la autoridad monetaria dejo abierta la posibilidad de ajustes.',
   repeat('La autoridad monetaria decidio por unanimidad mantener la tasa de interes sin cambios. ', 5),
   'https://apnews.com/demo/tasa-de-interes/',
   (select id from public.fuentes where dominio = 'apnews.com'),
   'dddddddd-0000-0000-0000-000000000003', 'verificada', 93, now() - interval '5 hours', 'economia',
   'https://picsum.photos/seed/banco/1200/675',
   'Imagen de demostracion - Lorem Picsum',
   'Fotografia generica de archivo usada como marcador en los datos de prueba'),

  ('dddddddd-aaaa-0000-0000-000000000013',
   'Una mision internacional evalua los danios tras el paso de la tormenta',
   'El equipo recorrio las zonas afectadas y adelanto que el informe preliminar se publicara esta semana.',
   repeat('La mision internacional recorrio las zonas afectadas para evaluar los danios de la tormenta. ', 5),
   'https://www.afp.com/demo/mision-tormenta/',
   (select id from public.fuentes where dominio = 'afp.com'),
   'dddddddd-0000-0000-0000-000000000003', 'verificada', 91, now() - interval '9 hours', 'mundo',
   'https://picsum.photos/seed/tormenta/1200/675',
   'Imagen de demostracion - Lorem Picsum',
   'Fotografia generica de archivo usada como marcador en los datos de prueba'),

  ('dddddddd-aaaa-0000-0000-000000000014',
   'El ministerio publica los resultados de la evaluacion docente',
   'El informe desglosa los resultados por departamento e incluye el calendario de los procesos de formacion.',
   repeat('El ministerio publico los resultados de la evaluacion docente desglosados por departamento. ', 5),
   'https://www.prensalibre.com/demo/evaluacion-docente/',
   (select id from public.fuentes where dominio = 'prensalibre.com'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 89, now() - interval '7 hours', 'guatemala',
   'https://picsum.photos/seed/escuela/1200/675',
   'Imagen de demostracion - Lorem Picsum',
   'Fotografia generica de archivo usada como marcador en los datos de prueba'),

  ('dddddddd-aaaa-0000-0000-000000000015',
   'La seleccion nacional define su clasificacion en el ultimo partido de la fase',
   'El resultado del proximo encuentro decide el paso a la siguiente ronda sin depender de otros marcadores.',
   repeat('La seleccion define su clasificacion en el ultimo partido de la fase de grupos. ', 5),
   'https://www.bbc.com/demo/clasificacion/',
   (select id from public.fuentes where dominio = 'bbc.com'),
   'dddddddd-0000-0000-0000-000000000003', 'verificada', 88, now() - interval '4 hours', 'deportes',
   'https://picsum.photos/seed/estadio/1200/675',
   'Imagen de demostracion - Lorem Picsum',
   'Fotografia generica de archivo usada como marcador en los datos de prueba'),

  ('dddddddd-aaaa-0000-0000-000000000016',
   'Un informe senala que el consumo electrico de los centros de datos se duplico',
   'El estudio compara el consumo de los ultimos cinco anios y proyecta la demanda para la proxima decada.',
   repeat('El informe compara el consumo electrico de los centros de datos en los ultimos cinco anios. ', 5),
   'https://elpais.com/demo/centros-de-datos/',
   (select id from public.fuentes where dominio = 'elpais.com'),
   'dddddddd-0000-0000-0000-000000000003', 'verificada', 87, now() - interval '14 hours', 'tecnologia',
   'https://picsum.photos/seed/servidores/1200/675',
   'Imagen de demostracion - Lorem Picsum',
   'Fotografia generica de archivo usada como marcador en los datos de prueba'),

  -- Las tres siguientes van sin foto: caen en el riel de titulares, que no las
  -- muestra, y sirven para comprobar que la portada no se rompe sin imagen.
  ('dddddddd-aaaa-0000-0000-000000000017',
   'El festival de cine centroamericano anuncia la lista de peliculas seleccionadas',
   'La programacion incluye largometrajes y cortos de la region, con funciones en tres sedes.',
   repeat('El festival anuncio la lista de peliculas seleccionadas para esta edicion. ', 5),
   'https://www.prensalibre.com/demo/festival-cine/',
   (select id from public.fuentes where dominio = 'prensalibre.com'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 82, now() - interval '20 hours', 'cultura',
   null, null, null),

  ('dddddddd-aaaa-0000-0000-000000000018',
   'Las autoridades municipales presentan el plan de movilidad para la zona central',
   'El plan contempla cambios de circulacion por etapas y un periodo de consulta antes de aplicarse.',
   repeat('Las autoridades presentaron el plan de movilidad para la zona central por etapas. ', 5),
   'https://lahora.gt/demo/plan-movilidad/',
   (select id from public.fuentes where dominio = 'lahora.gt'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 80, now() - interval '26 hours', 'guatemala',
   null, null, null),

  -- Medio digital, credibilidad intermedia y veracidad apenas sobre el umbral:
  -- entra, pero queda abajo. Es el contraste que hace visible la formula.
  ('dddddddd-aaaa-0000-0000-000000000019',
   'Usuarios reportan fallas intermitentes en un servicio de mensajeria',
   'Los reportes se concentraron en un periodo de dos horas y la empresa confirmo que atendia el incidente.',
   repeat('Los usuarios reportaron fallas intermitentes en el servicio de mensajeria durante dos horas. ', 5),
   'https://www.soy502.com/demo/fallas-mensajeria/',
   (select id from public.fuentes where dominio = 'soy502.com'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 77, now() - interval '30 hours', 'tecnologia',
   null, null, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Interacciones
--
-- Repartidas con criterio: la nota internacional y la deportiva mueven más
-- gente que un plan de movilidad. Sin esto las cuatro componentes del ranking
-- quedarían en cero menos dos, y el «¿por qué está aquí?» mostraría una tabla
-- de ceros justo en la pantalla que existe para explicar la fórmula.
-- ---------------------------------------------------------------------------

insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
select noticia, ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'reaccion', now() - (n || ' minutes')::interval
from (values
  ('dddddddd-aaaa-0000-0000-000000000011'::uuid, 16),
  ('dddddddd-aaaa-0000-0000-000000000012'::uuid, 11),
  ('dddddddd-aaaa-0000-0000-000000000013'::uuid,  9),
  ('dddddddd-aaaa-0000-0000-000000000014'::uuid, 13),
  ('dddddddd-aaaa-0000-0000-000000000015'::uuid, 19),
  ('dddddddd-aaaa-0000-0000-000000000016'::uuid,  8),
  ('dddddddd-aaaa-0000-0000-000000000017'::uuid,  5),
  ('dddddddd-aaaa-0000-0000-000000000018'::uuid,  4),
  ('dddddddd-aaaa-0000-0000-000000000019'::uuid,  7)
) as t(noticia, cuantas), generate_series(1, 20) as n
where n <= t.cuantas
on conflict do nothing;

-- El medio acreditado respalda las tres mejor sustentadas. Es la componente de
-- cuentas verificadas, que pesa distinto que una reacción cualquiera.
insert into public.interacciones (id_noticia, id_usuario, tipo, creado_en)
select noticia, 'dddddddd-0000-0000-0000-000000000003', 'reaccion', now() - interval '30 minutes'
from (values
  ('dddddddd-aaaa-0000-0000-000000000011'::uuid),
  ('dddddddd-aaaa-0000-0000-000000000012'::uuid),
  ('dddddddd-aaaa-0000-0000-000000000015'::uuid)
) as t(noticia)
on conflict do nothing;

insert into public.comentarios (id_noticia, id_usuario, contenido, creado_en)
select noticia, ('dddddddd-1000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'Comentario de demostracion numero ' || n,
       now() - (n || ' minutes')::interval
from (values
  ('dddddddd-aaaa-0000-0000-000000000011'::uuid, 7),
  ('dddddddd-aaaa-0000-0000-000000000015'::uuid, 9),
  ('dddddddd-aaaa-0000-0000-000000000012'::uuid, 3)
) as t(noticia, cuantos), generate_series(1, 20) as n
where n <= t.cuantos
on conflict do nothing;
