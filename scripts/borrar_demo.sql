-- Borra todo lo que siembra scripts/sembrar_demo.sql.
--
-- El prefijo `dddddddd-` en los identificadores existe justamente para poder
-- hacer esto sin riesgo de tocar datos reales. Las interacciones, comentarios y
-- validaciones se van en cascada desde noticias y usuarios.

delete from public.noticias where id::text like 'dddddddd-%';
delete from auth.users   where id::text like 'dddddddd-%';
