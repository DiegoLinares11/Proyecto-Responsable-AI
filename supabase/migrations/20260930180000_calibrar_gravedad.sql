-- ===========================================================================
-- Fase 3 — Calibración de la gravedad del decaimiento
--
-- Cambiar un peso es una decisión editorial y deja rastro: se cierra la fila
-- vigente y se abre una nueva con autor y motivo (ADR 0003). Esta es la primera
-- vez que se usa ese mecanismo, y vale la pena que el motivo diga la medición y
-- no solo la conclusión.
--
-- Qué se midió, sobre los datos de scripts/sembrar_demo.sql:
--
--   A (fuente registrada 75, veracidad 92, 6 h)   base 43.42  ->  1.919
--   B (fuente desconocida,   veracidad 76, 3 h)   base 24.05  ->  2.151
--
-- B quedaba primera. Con gravedad 1.5, tres horas de diferencia valen un factor
-- de 2x, y el término de antigüedad se mueve en órdenes de magnitud mientras que
-- los de calidad están acotados en 45 puntos: la frescura le gana siempre a
-- estar bien sustentado. Eso contradice el objetivo escrito del ranking.
--
-- Con 1.2, y junto con el cambio a veracidad al cuadrado que va en el código, A
-- gana por 21%. Queda margen para que la aserción de regresión no sea frágil.
-- ===========================================================================

update public.pesos_ranking
set vigente_hasta = now()
where clave = 'gravedad' and vigente_hasta is null;

insert into public.pesos_ranking (clave, valor, motivo)
values (
  'gravedad', 1.2000,
  'Calibracion sobre los datos sembrados. Con 1.5, una noticia de fuente desconocida y veracidad 76 con tres horas de vida le ganaba a una de fuente registrada y veracidad 92 con seis horas: el decaimiento se mueve en ordenes de magnitud y los terminos de calidad estan acotados en 45 puntos, asi que la frescura ganaba siempre. Con 1.2 y la veracidad al cuadrado, la bien sustentada gana por 21%.'
);
