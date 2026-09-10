-- ===========================================================================
-- Fase 1 — Políticas de seguridad a nivel de fila
--
-- El criterio de aceptación de la fase (docs/plan-por-fases.md):
--
--   «Un usuario sin noticias_publicar recibe error al intentar insertar una
--    noticia, incluso llamando directo a la API de Supabase con su propio
--    token.»
--
-- De ahí que la regla viva aquí y no en un middleware: el middleware se salta
-- si alguien llama a la base por otro camino, y con Supabase ese otro camino
-- está publicado en internet. Una política de fila viaja con el dato.
--
-- Dos convenciones que se siguen en todo el archivo:
--
--   · `(select auth.uid())` en vez de `auth.uid()`. Postgres evalúa el
--     subselect una sola vez por consulta en lugar de una vez por fila.
--
--   · Una sola política por tabla y acción, con las alternativas unidas por
--     OR. Varias políticas permisivas sobre la misma acción se evalúan todas
--     en cada fila, y además se vuelven difíciles de leer en conjunto — que en
--     control de accesos es el problema, no la lentitud.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Punto de partida: nadie puede nada
--
-- Supabase otorga privilegios amplios sobre las tablas nuevas de `public`.
-- Se revocan y se vuelven a dar uno por uno. `anon` no recibe nada: esta
-- plataforma no tiene lectura anónima.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'roles', 'permisos_rol', 'usuarios', 'silencios', 'cuentas_verificadas',
    'fuentes', 'noticias', 'validaciones', 'interacciones', 'comentarios',
    'pesos_ranking', 'conversaciones', 'mensajes', 'auditoria'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catálogos de permisos — lectura para todos, escritura por ningún lado
--
-- Sin políticas de escritura, así que solo la llave de servicio los toca.
-- ---------------------------------------------------------------------------

grant select on public.roles, public.permisos_rol to authenticated;

create policy "roles_lectura" on public.roles
  for select to authenticated using (true);

create policy "permisos_rol_lectura" on public.permisos_rol
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Usuarios
--
-- El feed muestra quién escribió cada noticia, así que el perfil de cualquiera
-- tiene que ser legible. El correo no: se otorga columna por columna en vez de
-- fila por fila, porque el problema aquí no es *qué filas* sino *qué campos*.
-- El cliente ya tiene el correo propio en su sesión de auth; no hace falta
-- servírselo otra vez desde una tabla donde también están los ajenos.
--
-- `update` se otorga solo sobre `nombre`. Con eso, cambiar el propio rol es
-- imposible desde el cliente aunque la política de fila lo dejara pasar; el
-- trigger `impedir_autoascenso` cubre la misma puerta desde el otro lado.
-- ---------------------------------------------------------------------------

grant select (id, nombre, id_rol, creado_en) on public.usuarios to authenticated;
grant update (nombre) on public.usuarios to authenticated;

create policy "usuarios_lectura" on public.usuarios
  for select to authenticated using (true);

create policy "usuarios_edicion_propia" on public.usuarios
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Silencios
--
-- Cada quien ve los suyos: si a alguien le quitaron comentar, tiene derecho a
-- saberlo y a leer el motivo. Los impone un moderador, y `impuesto_por` se
-- fuerza a ser él mismo — no se puede firmar una sanción a nombre de otro.
-- ---------------------------------------------------------------------------

grant select, insert, delete on public.silencios to authenticated;

create policy "silencios_lectura" on public.silencios
  for select to authenticated
  using (
    id_usuario = (select auth.uid())
    or public.rol_tiene_permiso('noticias_moderar')
  );

create policy "silencios_alta_por_moderador" on public.silencios
  for insert to authenticated
  with check (
    public.rol_tiene_permiso('noticias_moderar')
    and impuesto_por = (select auth.uid())
  );

create policy "silencios_baja_por_moderador" on public.silencios
  for delete to authenticated
  using (public.rol_tiene_permiso('noticias_moderar'));

-- ---------------------------------------------------------------------------
-- Cuentas verificadas
--
-- Legibles por todos: el distintivo es público y su peso en el ranking
-- también (ADR 0003). Otorgarlas es privilegio alto y pasa por el servidor.
-- ---------------------------------------------------------------------------

grant select on public.cuentas_verificadas to authenticated;

create policy "cuentas_verificadas_lectura" on public.cuentas_verificadas
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Fuentes
--
-- El registro entero es legible, incluida la justificación de cada puntaje.
-- Es una posición editorial (ADR 0002) y por eso se publica en vez de
-- esconderse.
-- ---------------------------------------------------------------------------

grant select on public.fuentes to authenticated;

create policy "fuentes_lectura" on public.fuentes
  for select to authenticated using (true);

create policy "fuentes_edicion_por_moderador" on public.fuentes
  for update to authenticated
  using (public.rol_tiene_permiso('fuentes_administrar'))
  with check (public.rol_tiene_permiso('fuentes_administrar'));

grant update on public.fuentes to authenticated;

-- ---------------------------------------------------------------------------
-- Noticias — el corazón de la fase
--
-- Lectura: las verificadas para quien pueda ver, las propias siempre, y todas
-- para un moderador. Un borrador ajeno no se lee.
--
-- Alta: hacen falta tres cosas a la vez — el permiso, ser uno mismo el autor,
-- y que la noticia nazca como borrador. Esa tercera condición es la que
-- impide que un publicador se auto-apruebe insertando directamente con
-- estado 'verificada'. El estado solo lo mueve el canal de validación de la
-- Fase 2 o un moderador.
--
-- Edición: el autor puede corregir mientras siga en borrador o le hayan
-- devuelto la noticia como no verificable; el WITH CHECK le impide sacarla de
-- esos dos estados. Un moderador puede mover cualquiera.
-- ---------------------------------------------------------------------------

grant select, insert, update on public.noticias to authenticated;

create policy "noticias_lectura" on public.noticias
  for select to authenticated
  using (
    (estado = 'verificada' and public.rol_tiene_permiso('noticias_ver'))
    or id_autor = (select auth.uid())
    or public.rol_tiene_permiso('noticias_moderar')
  );

create policy "noticias_alta_por_publicador" on public.noticias
  for insert to authenticated
  with check (
    public.rol_tiene_permiso('noticias_publicar')
    and id_autor = (select auth.uid())
    and estado = 'borrador'
    and publicada_en is null
  );

create policy "noticias_edicion" on public.noticias
  for update to authenticated
  using (
    (id_autor = (select auth.uid()) and estado in ('borrador', 'no_verificable'))
    or public.rol_tiene_permiso('noticias_moderar')
  )
  with check (
    (id_autor = (select auth.uid()) and estado in ('borrador', 'no_verificable'))
    or public.rol_tiene_permiso('noticias_moderar')
  );

-- Nadie borra noticias desde el cliente, ni su autor. Se archivan cambiando
-- el estado, y el rastro queda. Por eso no hay política de delete.

-- ---------------------------------------------------------------------------
-- Validaciones
--
-- El `exists` contra noticias hereda la política de arriba: si la noticia no
-- se puede ver, su desglose tampoco. La visibilidad se define en un solo lugar.
-- Las escribe el canal de validación con la llave de servicio.
-- ---------------------------------------------------------------------------

grant select on public.validaciones to authenticated;

create policy "validaciones_lectura" on public.validaciones
  for select to authenticated
  using (
    exists (
      select 1 from public.noticias n
      where n.id = validaciones.id_noticia
    )
  );

-- ---------------------------------------------------------------------------
-- Interacciones
--
-- Cada quien ve las suyas; los conteos del feed los calcula el servidor y
-- viajan ya agregados en las columnas de `noticias`, así que el cliente nunca
-- necesita leer las interacciones ajenas.
--
-- Al insertar se decide según el tipo: reaccionar exige `puede('reaccionar')`,
-- que es el rol menos el silencio; registrar una lectura solo exige poder ver.
-- Y solo sobre noticias que el usuario alcanza a ver, para que no se pueda
-- inflar un borrador ajeno.
-- ---------------------------------------------------------------------------

grant select, insert, delete on public.interacciones to authenticated;

create policy "interacciones_lectura_propia" on public.interacciones
  for select to authenticated
  using (
    id_usuario = (select auth.uid())
    or public.rol_tiene_permiso('noticias_moderar')
  );

create policy "interacciones_alta" on public.interacciones
  for insert to authenticated
  with check (
    id_usuario = (select auth.uid())
    and exists (select 1 from public.noticias n where n.id = id_noticia)
    and case tipo
          when 'reaccion' then public.puede('reaccionar')
          when 'lectura'  then public.rol_tiene_permiso('noticias_ver')
        end
  );

create policy "interacciones_baja_propia" on public.interacciones
  for delete to authenticated
  using (id_usuario = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Comentarios
--
-- Un comentario oculto lo sigue viendo su autor y lo ve un moderador. Ocultar
-- no es borrar: el autor sabe que pasó.
-- ---------------------------------------------------------------------------

grant select, insert, update on public.comentarios to authenticated;

create policy "comentarios_lectura" on public.comentarios
  for select to authenticated
  using (
    exists (select 1 from public.noticias n where n.id = comentarios.id_noticia)
    and (
      not oculto
      or id_usuario = (select auth.uid())
      or public.rol_tiene_permiso('noticias_moderar')
    )
  );

create policy "comentarios_alta" on public.comentarios
  for insert to authenticated
  with check (
    id_usuario = (select auth.uid())
    and public.puede('comentar')
    and exists (
      select 1 from public.noticias n
      where n.id = id_noticia and n.estado = 'verificada'
    )
  );

create policy "comentarios_edicion" on public.comentarios
  for update to authenticated
  using (
    id_usuario = (select auth.uid())
    or public.rol_tiene_permiso('noticias_moderar')
  )
  with check (
    id_usuario = (select auth.uid())
    or public.rol_tiene_permiso('noticias_moderar')
  );

-- ---------------------------------------------------------------------------
-- Pesos del ranking
--
-- Legibles por cualquiera. La fórmula es pública a propósito (ADR 0003): un
-- ordenamiento que no se puede auditar es lo que este curso enseña a no
-- construir. Cambiarlos pasa por el servidor, con motivo y autor.
-- ---------------------------------------------------------------------------

grant select on public.pesos_ranking to authenticated;

create policy "pesos_ranking_lectura" on public.pesos_ranking
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Chatbot — solo lectura, y solo de lo propio
--
-- No hay política de inserción: los turnos los escribe la ruta de servidor con
-- la llave de servicio. Si el cliente pudiera insertar en `mensajes`, podría
-- fabricar su propia bitácora — decir que la capa 1 lo dejó pasar, o borrarse
-- un bloqueo. Una bitácora que el auditado puede escribir no sirve de nada.
-- ---------------------------------------------------------------------------

grant select on public.conversaciones, public.mensajes to authenticated;

create policy "conversaciones_lectura_propia" on public.conversaciones
  for select to authenticated
  using (id_usuario = (select auth.uid()));

create policy "mensajes_lectura_propia" on public.mensajes
  for select to authenticated
  using (
    exists (
      select 1 from public.conversaciones c
      where c.id = mensajes.id_conversacion
        and c.id_usuario = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Auditoría — se agrega y no se toca
--
-- Solo la lee quien modera. No se otorgan insert, update ni delete a nadie que
-- no sea la llave de servicio, y además se revocan explícitamente para que la
-- intención quede escrita y no dependa de recordar no otorgarlos después.
-- ---------------------------------------------------------------------------

grant select on public.auditoria to authenticated;
revoke insert, update, delete on public.auditoria from anon, authenticated;

create policy "auditoria_lectura_por_moderador" on public.auditoria
  for select to authenticated
  using (public.rol_tiene_permiso('noticias_moderar'));
