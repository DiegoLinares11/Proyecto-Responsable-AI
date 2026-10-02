-- ===========================================================================
-- Lectura pública del feed
--
-- La Fase 1 decidió que esta plataforma no tenía lectura anónima. Al construir
-- la interfaz quedó claro que esa decisión estaba mal para lo que el proyecto
-- es: una plataforma de **noticias publicadas**. Exigir cuenta para leer una
-- noticia que ya se declaró pública no protege nada y contradice el propósito.
--
-- Y hay una segunda razón, más técnica y más importante. Sin lectura anónima, la
-- interfaz tenía que leer el feed con la llave de servicio —que SE SALTA todas
-- las políticas de fila— porque era eso o una pantalla vacía. Esa deuda estaba
-- declarada en `src/lib/consultas.ts` y era el agujero más grande del proyecto:
-- la capa de control de accesos existía pero la aplicación no la usaba.
--
-- Con esta migración, el feed se lee con la llave publicable, la política de
-- abajo es la que decide, y **RLS vuelve a ser la frontera de verdad** en vez de
-- una capa que el código esquiva.
--
-- Lo que `anon` puede ver, y nada más:
--
--   · Noticias en estado `verificada`. Ni borradores, ni las que están en
--     moderación, ni las desmentidas.
--   · El registro de fuentes y los pesos del ranking, que son públicos a
--     propósito (ADR 0002 y 0003): un sistema que pone sellos y ordena tiene que
--     poder explicarse a quien lo lee.
--   · El desglose de validación de las noticias que ya puede ver.
--
-- Lo que sigue necesitando sesión: comentar, reaccionar, publicar, moderar, ver
-- la bitácora, y todo lo que tenga que ver con usuarios.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Noticias verificadas
-- ---------------------------------------------------------------------------

grant select on public.noticias to anon;

create policy "noticias_lectura_publica" on public.noticias
  for select to anon
  using (estado = 'verificada');

comment on policy "noticias_lectura_publica" on public.noticias is
  'Solo verificadas. Un visitante sin cuenta no ve borradores, ni lo que está en moderación, ni lo desmentido.';

-- ---------------------------------------------------------------------------
-- Fuentes y pesos: la transparencia es parte del producto
-- ---------------------------------------------------------------------------

grant select on public.fuentes to anon;

create policy "fuentes_lectura_publica" on public.fuentes
  for select to anon using (true);

grant select on public.pesos_ranking to anon;

create policy "pesos_ranking_lectura_publica" on public.pesos_ranking
  for select to anon using (true);

-- ---------------------------------------------------------------------------
-- El desglose de validación
--
-- El `exists` hereda la política de arriba: si la noticia no se puede ver, su
-- desglose tampoco. La visibilidad se define en un solo lugar.
-- ---------------------------------------------------------------------------

grant select on public.validaciones to anon;

create policy "validaciones_lectura_publica" on public.validaciones
  for select to anon
  using (
    exists (
      select 1 from public.noticias n
      where n.id = validaciones.id_noticia
    )
  );

-- ---------------------------------------------------------------------------
-- Cuentas verificadas: el distintivo es público, igual que para quien ya tiene
-- sesión. Sin esto, el feed no podría mostrar qué medios respaldan una noticia.
-- ---------------------------------------------------------------------------

grant select on public.cuentas_verificadas to anon;

create policy "cuentas_verificadas_lectura_publica" on public.cuentas_verificadas
  for select to anon using (true);
