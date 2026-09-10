-- ===========================================================================
-- Fase 1 — Semillas
--
-- Lo mínimo para que el sistema arranque: los cuatro roles con sus claves, los
-- pesos iniciales del ranking y un registro de fuentes de partida.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

insert into public.roles (clave, nombre) values
  ('lector',        'Lector'),
  ('publicador',    'Publicador'),
  ('moderador',     'Moderador'),
  ('administrador', 'Administrador')
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- Claves por rol
--
-- Acumulativo hacia arriba, pero escrito completo por rol en vez de heredado:
-- así se lee de un vistazo qué puede cada uno, sin reconstruir una cadena
-- mental de herencias. En una tabla de permisos, explícito le gana a conciso.
-- ---------------------------------------------------------------------------

insert into public.permisos_rol (id_rol, clave_permiso)
select r.id, p.clave
from public.roles r
join (values
  ('lector',        'noticias_ver'),
  ('lector',        'noticias_comentar'),
  ('lector',        'noticias_reaccionar'),

  ('publicador',    'noticias_ver'),
  ('publicador',    'noticias_comentar'),
  ('publicador',    'noticias_reaccionar'),
  ('publicador',    'noticias_publicar'),

  ('moderador',     'noticias_ver'),
  ('moderador',     'noticias_comentar'),
  ('moderador',     'noticias_reaccionar'),
  ('moderador',     'noticias_publicar'),
  ('moderador',     'noticias_moderar'),
  ('moderador',     'fuentes_administrar'),

  ('administrador', 'noticias_ver'),
  ('administrador', 'noticias_comentar'),
  ('administrador', 'noticias_reaccionar'),
  ('administrador', 'noticias_publicar'),
  ('administrador', 'noticias_moderar'),
  ('administrador', 'fuentes_administrar'),
  ('administrador', 'usuarios_administrar')
) as p(rol, clave) on p.rol = r.clave
on conflict (id_rol, clave_permiso) do nothing;

-- ---------------------------------------------------------------------------
-- Pesos iniciales del ranking
--
-- Son una hipótesis, no una verdad. La Fase 3 los calibra con datos sembrados
-- y con las aserciones de docs/ranking-relevancia.md.
-- ---------------------------------------------------------------------------

insert into public.pesos_ranking (clave, valor, motivo) values
  ('w_interaccion', 1.0000,  'Valor inicial. La tracción propia cuenta, pero es la señal más fácil de manipular, así que entra con el peso más bajo.'),
  ('w_verificadas', 1.5000,  'Valor inicial. Una reacción de cuenta verificada pesa más que una anónima, que es el requisito explícito del proyecto.'),
  ('w_fuente',      20.0000, 'Valor inicial. La credibilidad de la fuente entra normalizada a 0-1, de ahí la escala.'),
  ('w_veracidad',   25.0000, 'Valor inicial. Es el peso más alto a propósito: la plataforma premia estar bien sustentado antes que ser popular.'),
  ('gravedad',      1.5000,  'Valor inicial, tomado del ranking de Hacker News. Sin decaimiento el feed deja de ser un feed.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Registro de fuentes de partida
--
-- ADVERTENCIA, y va en el informe (ADR 0002): esta tabla es una posición
-- editorial del equipo, no un hecho medido. El criterio usado para el puntaje
-- inicial es de proceso, no de simpatía — si el medio publica manual de
-- estilo, si firma sus notas, si tiene política de correcciones visible y si
-- distingue nota de opinión.
--
-- El punto ciego conocido: los medios locales guatemaltecos aparecen menos en
-- los índices internacionales, así que arrancan más abajo que su trabajo. Para
-- eso está la cola de moderación, y por eso un dominio desconocido entra con
-- puntaje bajo pero NUNCA rechazado.
--
-- El equipo debe revisar esta lista antes de la entrega y dejar constancia de
-- quién la revisó.
-- ---------------------------------------------------------------------------

insert into public.fuentes (dominio, nombre, nivel, puntaje_credibilidad, justificacion) values
  ('reuters.com', 'Reuters', 'agencia_internacional', 90,
   'Agencia de noticias con manual de estilo público, política de correcciones documentada y separación explícita entre nota y opinión.'),
  ('apnews.com', 'Associated Press', 'agencia_internacional', 90,
   'Agencia con libro de estilo público, correcciones fechadas y firma de autoría en las notas.'),
  ('afp.com', 'Agence France-Presse', 'agencia_internacional', 88,
   'Agencia internacional con servicio de verificacion de datos propio y politica de correcciones publicada.'),
  ('bbc.com', 'BBC', 'agencia_internacional', 85,
   'Medio internacional con normas editoriales publicadas y un mecanismo de quejas y correcciones accesible.'),
  ('elpais.com', 'El País', 'medio_nacional', 78,
   'Diario con defensor del lector, correcciones publicadas y separacion visible entre informacion y opinion.'),
  ('prensalibre.com', 'Prensa Libre', 'medio_nacional', 75,
   'Diario guatemalteco de circulacion nacional, con notas firmadas y seccion de opinion diferenciada.'),
  ('lahora.gt', 'La Hora', 'medio_nacional', 70,
   'Diario guatemalteco con trayectoria larga, notas firmadas y separacion entre informacion y opinion.'),
  ('soy502.com', 'Soy502', 'medio_digital', 55,
   'Medio digital guatemalteco de alcance amplio; mezcla nota informativa con contenido de entretenimiento, de ahi el puntaje intermedio.'),
  ('republica.gt', 'República', 'medio_digital', 55,
   'Medio digital guatemalteco con firma de autoria; linea editorial marcada, se pondera como medio digital.')
on conflict (dominio) do nothing;
