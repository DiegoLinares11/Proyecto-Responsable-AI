-- ===========================================================================
-- Fase 2 — Feeds RSS del registro de fuentes
--
-- Segundo proveedor de corroboración. GDELT limita por dirección IP y desde una
-- red compartida devuelve 429 pase lo que pase, así que la señal que vale 30 de
-- los 100 puntos no se puede sostener sobre él solo.
--
-- Se eligió consultar los feeds que cada medio publica POR SU CUENTA para ser
-- sindicado. La alternativa evaluada era Google News RSS, que da mucha más
-- cobertura y funciona bien desde Guatemala, pero su propio feed declara que el
-- uso está limitado a lectores personales no comerciales. En un proyecto sobre
-- IA responsable, tomar ese atajo y no decirlo habría sido incoherente con el
-- tema del trabajo. Un RSS existe justamente para que alguien lo lea; el
-- permiso es explícito.
--
-- El precio de la decisión, y va en el informe: menos cobertura. Solo se
-- corrobora contra los medios del registro, no contra todo internet.
--
-- URLs comprobadas una por una contra el servicio real el 2026-09-30. Reuters y
-- AP cerraron sus RSS públicos hace años y Soy502 no publica ninguno: quedan
-- con `url_rss` nulo y simplemente no participan de esta vía.
-- ===========================================================================

alter table public.fuentes
  add column url_rss text
    check (url_rss is null or url_rss ~ '^https?://');

comment on column public.fuentes.url_rss is
  'Feed que el medio publica para ser sindicado. Nulo si no ofrece: Reuters y AP los cerraron, y no todos los medios digitales publican uno.';

update public.fuentes set url_rss = 'https://www.prensalibre.com/feed/'
  where dominio = 'prensalibre.com';

update public.fuentes set url_rss = 'https://lahora.gt/feed/'
  where dominio = 'lahora.gt';

update public.fuentes set url_rss = 'https://republica.gt/feed/'
  where dominio = 'republica.gt';

update public.fuentes set url_rss = 'https://feeds.bbci.co.uk/mundo/rss.xml'
  where dominio = 'bbc.com';

update public.fuentes set url_rss = 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada'
  where dominio = 'elpais.com';

update public.fuentes set url_rss = 'https://www.afp.com/en/rss.xml'
  where dominio = 'afp.com';

-- Índice parcial: la consulta que arma la lista de feeds solo pide los que
-- existen, y son minoría frente al total de fuentes que llegará a tener el
-- registro.
create index fuentes_con_feed_idx
  on public.fuentes (dominio)
  where url_rss is not null;
