-- ===========================================================================
-- La portada: sección e imagen
--
-- Hasta acá el feed era una lista de titulares, y se veía como lo que era: un
-- documento. Un lector de noticias reconoce una portada por tres cosas —la foto,
-- la sección arriba del titular, y la jerarquía entre la nota principal y el
-- resto— y de esas tres el esquema no soportaba ninguna.
--
-- Dos decisiones que no son de estética:
--
-- 1. `url_imagen` exige https, no http. No es purismo: una imagen por http en
--    una página servida por https la bloquea el navegador, y además deja el
--    tráfico a la vista. Vale más rechazarla al insertar que descubrirlo en
--    producción con el hueco en la portada.
--
-- 2. `credito_imagen` existe porque publicar la foto de alguien sin atribuirla,
--    en un proyecto cuyo argumento entero es la procedencia de la información,
--    sería contradecirse en la propia portada.
--
-- Queda anotado para el informe: una imagen remota la pide el navegador del
-- lector, así que el servidor del medio ve su IP y su referer. Es cómo funciona
-- toda la prensa en línea, y es igual un dato que el lector no eligió entregar.
-- La salida es servirlas por un proxy propio o por Storage; no se hace ahora,
-- se declara.
-- ===========================================================================

create type public.seccion_noticia as enum (
  'general',
  'guatemala',
  'mundo',
  'politica',
  'economia',
  'deportes',
  'cultura',
  'tecnologia'
);

alter table public.noticias
  -- 'general' es el valor honesto para lo que ya estaba cargado: no sabemos su
  -- sección, y no se la vamos a inventar.
  add column seccion public.seccion_noticia not null default 'general',
  add column url_imagen text check (url_imagen ~ '^https://'),
  add column credito_imagen text check (credito_imagen is null or length(trim(credito_imagen)) between 2 and 200),

  -- Una foto sin texto alternativo deja fuera a quien usa lector de pantalla.
  -- Que sea una columna y no una ocurrencia del formulario es para que se note
  -- cuando falta.
  add column texto_alterno_imagen text check (texto_alterno_imagen is null or length(trim(texto_alterno_imagen)) between 5 and 300),

  -- Si hay imagen, tiene que haber crédito y texto alterno. La regla vive en la
  -- base y no en el formulario, por lo mismo de siempre: el formulario no es el
  -- único camino hasta esta tabla.
  add constraint noticias_imagen_con_credito_y_alterno check (
    url_imagen is null
    or (credito_imagen is not null and texto_alterno_imagen is not null)
  );

-- El feed ya ordena por relevancia; con sección de por medio se van a pedir
-- también portadas por sección.
create index noticias_seccion_relevancia_idx
  on public.noticias (seccion, relevancia desc)
  where estado = 'verificada';

comment on column public.noticias.seccion is
  'Sección editorial. La elige quien publica; no la infiere ningún modelo (ADR 0002).';
comment on column public.noticias.url_imagen is
  'Imagen de portada. Solo https. La pide el navegador del lector, así que el medio ve su IP.';
