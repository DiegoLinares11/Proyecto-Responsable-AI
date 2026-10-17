-- ===========================================================================
-- Nadie publica su propia noticia
--
-- Un publicador ya no podía aprobarse: la política de inserción le exige
-- `borrador`. Pero un moderador sí podía aprobar lo que él mismo escribió, y
-- desde que el canal solo recomienda (R-09), aprobar es publicar. Ahora la
-- noticia de un moderador la publica otro moderador: cuatro ojos, no dos.
--
-- La regla va en el WITH CHECK, que mira la fila como queda: un moderador no
-- puede dejar en `verificada` una noticia cuyo autor es él. Sacar de
-- publicación la propia (archivar, no verificable) sí puede: es la dirección
-- segura. `decidirComoModerador` lo comprueba antes para dar un mensaje claro;
-- la frontera es esta. Sección 19 de la suite de RLS.
-- ===========================================================================

drop policy "noticias_edicion" on public.noticias;

create policy "noticias_edicion" on public.noticias
  for update to authenticated
  using (
    (id_autor = (select auth.uid()) and estado in ('borrador', 'no_verificable'))
    or interno.rol_tiene_permiso('noticias_moderar')
  )
  with check (
    (id_autor = (select auth.uid()) and estado in ('borrador', 'no_verificable'))
    or (
      interno.rol_tiene_permiso('noticias_moderar')
      and not (estado = 'verificada' and id_autor = (select auth.uid()))
    )
  );
