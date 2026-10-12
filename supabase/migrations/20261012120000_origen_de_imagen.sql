-- ===========================================================================
-- De dónde sale cada imagen (R-10)
--
-- El enunciado pide una imagen para la noticia que no trae, y pide que una
-- imagen hecha con IA no se confunda con una foto real. Las dos cosas se
-- resuelven igual: guardando de dónde sale cada imagen, y mostrándolo siempre.
--
--   - medio:          la publicó el medio con la nota (por ejemplo, su og:image).
--   - licencia_libre: foto de archivo con licencia libre (Wikimedia Commons). Casi
--                     nunca es del hecho —la foto de «incendio forestal» suele ser
--                     de otro incendio—, y la interfaz lo dice.
--   - ilustracion:    la ilustración tipográfica: sección y titular sobre tinta.
--                     No hay archivo: se compone al mostrarla. Sin IA y sin costo.
--   - generada_ia:    hecha con un modelo. Hoy nadie la produce; existe para que,
--                     si algún día se usa, la base la distinga y la interfaz la
--                     rotule. Sin la categoría, una imagen de IA sería «foto».
--
-- Las reglas viven en la base, como las del crédito y el texto alterno: el
-- formulario no es el único camino hasta esta tabla.
-- ===========================================================================

create type public.origen_imagen as enum ('medio', 'licencia_libre', 'ilustracion', 'generada_ia');

alter table public.noticias
  add column origen_imagen public.origen_imagen,
  -- Dónde está la imagen original con su licencia: la página del archivo en
  -- Commons, o la nota del medio. La atribución de CC BY la exige.
  add column url_fuente_imagen text check (url_fuente_imagen is null or url_fuente_imagen ~ '^https://');

-- Lo que ya estaba: las fotos de demostración son de Lorem Picsum (fotos de
-- Unsplash, de uso libre); el resto la puso el medio.
update public.noticias
   set origen_imagen = 'licencia_libre', url_fuente_imagen = 'https://picsum.photos/'
 where url_imagen like 'https://picsum.photos/%';

update public.noticias
   set origen_imagen = 'medio',
       url_fuente_imagen = case when url_original ~ '^https://' then url_original end
 where url_imagen is not null and origen_imagen is null;

alter table public.noticias
  -- Una imagen con archivo tiene origen, y la ilustración no tiene archivo.
  -- Escrita con CASE a propósito: con `origen in (...)` y un origen nulo, la
  -- expresión da NULL, y un CHECK que da NULL deja pasar la fila —la foto sin
  -- origen entraba—. Lo encontró la prueba 16 de la suite de RLS.
  add constraint noticias_imagen_tiene_origen check (
    case
      when url_imagen is null then origen_imagen is null or origen_imagen = 'ilustracion'
      else origen_imagen is not null and origen_imagen <> 'ilustracion'
    end
  ),
  -- Sin el enlace al archivo, una licencia libre no se puede comprobar ni
  -- atribuir como pide.
  add constraint noticias_licencia_libre_con_fuente check (
    origen_imagen is distinct from 'licencia_libre' or url_fuente_imagen is not null
  );

comment on column public.noticias.origen_imagen is
  'De dónde sale la imagen. La interfaz lo muestra siempre: una foto de archivo o una imagen de IA no pueden pasar por foto del hecho (R-10).';
comment on column public.noticias.url_fuente_imagen is
  'La página de la imagen original con su licencia (Commons) o la nota del medio.';
