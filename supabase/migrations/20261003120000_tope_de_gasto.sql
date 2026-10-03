-- ===========================================================================
-- El tope de gasto, que hasta ahora era una variable que nadie leía
--
-- `TOPE_GASTO_USD_ACUMULADO` existía en el entorno desde la Fase 4 y ningún
-- código la comprobaba: el chatbot seguía contestando aunque el crédito se
-- terminara. Con un presupuesto total de $20 eso no es un detalle, es el modo en
-- que el proyecto se queda sin chatbot a mitad de la presentación.
--
-- Esta vista da el número contra el que se compara. Tres decisiones:
--
-- 1. **Es una vista y no una función.** La primera versión fue una función en
--    `public`, y la suite de RLS la rechazó: la sección 9 exige que no quede
--    ninguna función nuestra en el esquema publicado, que es la regla que cerró
--    el hallazgo de los advisors en la Fase 1. Se sigue el mismo patrón que los
--    insumos del ranking: vista con `security_invoker`, sin acceso para nadie
--    que no sea el servidor.
--
-- 2. **Solo cuenta gasto real de API.** Los turnos del modo suscripción se
--    registran con `modelo = 'suscripcion'` y un costo ESTIMADO por el SDK: lo
--    que habría costado por API, no algo que se haya pagado. Sumarlos haría que
--    un par de tardes de desarrollo local apagaran el chatbot desplegado por
--    dinero que nunca salió de ningún lado. La marca la pone el proveedor de
--    suscripción (`MODELO_DE_SUSCRIPCION` en el código), y una prueba unitaria
--    comprueba que siga siendo exactamente esa cadena.
--
-- 3. **Una sola fila con la suma, no las filas para sumar.** PostgREST corta
--    las respuestas en 1000 filas por omisión; un tope que suma del lado del
--    cliente dejaría de contar justo cuando más importa, sin avisar.
--
-- Lo que NO cuenta: las corridas del red team, que no escriben en `mensajes` a
-- propósito para no mezclar ataques con tráfico real. Esas suman su propio
-- gasto al consultar el tope. La garantía dura sigue siendo que el crédito
-- prepago de la API no puede quedar en negativo; esto es lo que hace que el
-- chatbot se apague ANTES, dejando margen para medir.
-- ===========================================================================

create view public.vista_gasto_api
with (security_invoker = true) as
select coalesce(sum(m.costo_usd), 0)::numeric(12, 6) as gasto_usd,
       count(*)                                     as turnos
from public.mensajes m
where m.rol = 'asistente'
  and m.modelo is not null
  and m.modelo <> 'suscripcion';

comment on view public.vista_gasto_api is
  'Gasto real de API del chatbot, en una fila. Excluye los costos estimados del modo suscripción. Solo service_role.';

-- Supabase concede acceso a las vistas nuevas por omisión; se quita explícito.
revoke all on public.vista_gasto_api from anon, authenticated;
