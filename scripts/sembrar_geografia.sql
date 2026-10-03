-- ===========================================================================
-- Geografía de las noticias de demostración
--
-- La migración 20261003180000 dejó todo lo publicado como nacional de
-- Guatemala, que es lo que es la mayor parte. Esto corrige lo que no lo es, y
-- agrega noticias locales en varios departamentos: sin ellas, comparar dos
-- ubicaciones en la demostración no mostraría ninguna diferencia.
--
-- Se corre después de sembrar_demo.sql y sembrar_portada.sql. Después:
--   node scripts/recalcular_ranking.mjs
--
-- Las noticias locales son, como el resto, texto de demostración: titulares
-- genéricos, sin personas reales, y un cuerpo que dice que es de prueba.
-- ===========================================================================

-- --- Lo internacional ------------------------------------------------------

update public.noticias set alcance = 'internacional', pais = null, id_ubicacion = null
where id in (
  'dddddddd-aaaa-0000-0000-000000000011',  -- hoja de ruta de emisiones
  'dddddddd-aaaa-0000-0000-000000000012',  -- banco central (no dice de qué país)
  'dddddddd-aaaa-0000-0000-000000000013',  -- misión tras la tormenta
  'dddddddd-aaaa-0000-0000-000000000016'   -- consumo de los centros de datos
);

-- Las tres que entraron por el canal de verdad el 2 de octubre.
update public.noticias set alcance = 'internacional', pais = null, id_ubicacion = null
where url_original like 'https://www.bbc.com/mundo/articles/cw8r6rdyz2p0o%';     -- Piketty

update public.noticias set alcance = 'internacional', pais = 'US', id_ubicacion = null
where url_original like 'https://www.prensalibre.com/internacional/estados-unidos/%';  -- ICE, Michigan

update public.noticias set alcance = 'local', id_ubicacion = 'GT-SR'
where url_original like 'https://lahora.gt/%laguna-de-ayarza%';                   -- Santa Rosa

-- --- Lo local de la capital ------------------------------------------------

update public.noticias set alcance = 'local', id_ubicacion = 'GT-GU'
where id in (
  'dddddddd-aaaa-0000-0000-000000000017',  -- festival de cine, sedes en la capital
  'dddddddd-aaaa-0000-0000-000000000018'   -- plan de movilidad de la zona central
);

-- --- Noticias locales de otros departamentos -------------------------------

insert into public.noticias
  (id, titulo, resumen, cuerpo, url_original, id_fuente, id_autor, estado,
   puntaje_veracidad, publicada_en, seccion, alcance, pais, id_ubicacion)
values
  ('dddddddd-aaaa-0000-0000-000000000021',
   'Quetzaltenango amplia el horario de atencion en los centros de salud del area urbana',
   'La medida rige desde esta semana y busca reducir las filas de la manana, segun la direccion de area de salud.',
   'La direccion de area de salud anuncio la ampliacion del horario en los centros del area urbana.' || chr(10) || chr(10) ||
   'Este es texto de demostracion para comparar ubicaciones en la app: una noticia local de Quetzaltenango.',
   'https://lahora.gt/demo/quetzaltenango-salud/',
   (select id from public.fuentes where dominio = 'lahora.gt'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 84, now() - interval '3 hours',
   'guatemala', 'local', 'GT', 'GT-QZ'),

  ('dddddddd-aaaa-0000-0000-000000000022',
   'Peten reporta avances en la temporada de control de incendios forestales',
   'Las brigadas reportan menos focos activos que el ano anterior y mantienen la vigilancia en las areas protegidas.',
   'Las brigadas de control de incendios reportaron avances en la temporada.' || chr(10) || chr(10) ||
   'Este es texto de demostracion para comparar ubicaciones en la app: una noticia local de Peten.',
   'https://www.prensalibre.com/demo/peten-incendios/',
   (select id from public.fuentes where dominio = 'prensalibre.com'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 86, now() - interval '5 hours',
   'guatemala', 'local', 'GT', 'GT-PE'),

  ('dddddddd-aaaa-0000-0000-000000000023',
   'Escuintla anuncia cierres temporales en un tramo de la ruta al Pacifico por reparaciones',
   'Los trabajos se haran por la noche durante dos semanas y habra un paso alterno senalizado.',
   'Las autoridades anunciaron cierres temporales nocturnos por reparaciones.' || chr(10) || chr(10) ||
   'Este es texto de demostracion para comparar ubicaciones en la app: una noticia local de Escuintla.',
   'https://lahora.gt/demo/escuintla-ruta/',
   (select id from public.fuentes where dominio = 'lahora.gt'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 82, now() - interval '4 hours',
   'guatemala', 'local', 'GT', 'GT-ES'),

  ('dddddddd-aaaa-0000-0000-000000000024',
   'Alta Verapaz habilita albergues temporales tras las lluvias de la semana',
   'Los albergues funcionan en escuelas de tres municipios y las autoridades piden atender los avisos de evacuacion.',
   'Las autoridades habilitaron albergues temporales tras las lluvias.' || chr(10) || chr(10) ||
   'Este es texto de demostracion para comparar ubicaciones en la app: una noticia local de Alta Verapaz.',
   'https://www.prensalibre.com/demo/alta-verapaz-albergues/',
   (select id from public.fuentes where dominio = 'prensalibre.com'),
   'dddddddd-0000-0000-0000-000000000001', 'verificada', 88, now() - interval '6 hours',
   'guatemala', 'local', 'GT', 'GT-AV')
on conflict (id) do nothing;
