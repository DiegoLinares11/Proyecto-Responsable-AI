-- ===========================================================================
-- El gasto, desglosado por modelo (R-11)
--
-- El panel de gasto muestra el total de `vista_gasto_api` —la misma vista que
-- usa el tope, un solo número de verdad— y este desglose. Cada turno guarda el
-- modelo con el que terminó, y eso dice hasta dónde llegó:
--
--   · sin modelo: lo cortó la capa 0, sin gastar un token;
--   · el modelo chico: solo pasó por el clasificador (un bloqueo o una
--     cortesía);
--   · el modelo grande: llegó a la respuesta, y su costo incluye al
--     clasificador.
--
-- Mismo filtro que `vista_gasto_api`: los turnos en modo suscripción son
-- estimados del arnés, no dinero, y no cuentan. La suite de RLS comprueba que
-- la suma de este desglose da el total de esa vista (sección 18).
-- ===========================================================================

create view public.vista_gasto_por_modelo
with (security_invoker = true) as
select m.modelo,
       count(*)                                     as turnos,
       coalesce(sum(m.costo_usd), 0)::numeric(12, 6) as gasto_usd,
       coalesce(avg(m.costo_usd), 0)::numeric(12, 6) as promedio_usd
from public.mensajes m
where m.rol = 'asistente'
  and (m.modelo is null or m.modelo <> 'suscripcion')
group by m.modelo;

comment on view public.vista_gasto_por_modelo is
  'Gasto real de API del chatbot por modelo con el que terminó el turno. Mismo filtro que vista_gasto_api. Solo service_role.';

-- Supabase concede acceso a las vistas nuevas por omisión; se quita explícito,
-- igual que en vista_gasto_api: el gasto lo ve el administrador por el
-- servidor, no cualquier sesión.
revoke all on public.vista_gasto_por_modelo from anon, authenticated;
