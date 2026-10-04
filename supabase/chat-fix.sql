-- ============================================================
--  EDTU — ARREGLO DEL CHAT (agregar amigos no funcionaba)
--  Supabase → SQL Editor → New query → pega TODO → Run
--
--  QUÉ ARREGLA:
--  1) Antes, cada jugador SOLO podía ver su propio perfil, así que no
--     se podían leer los nombres de los amigos (la lista salía vacía).
--     Ahora el NOMBRE de cualquier jugador se puede ver (hace falta para
--     la lista de amigos y la búsqueda), pero cada quien solo puede
--     CAMBIAR el suyo.
--  2) Permite ver la presencia (en línea) de los demás.
-- ============================================================

-- 1) PERFILES: ver el nombre de todos, editar solo el tuyo
drop policy if exists players_propio on public.players;

drop policy if exists players_ver on public.players;
create policy players_ver on public.players
  for select to authenticated
  using (true);                      -- cualquiera con cuenta ve los nombres

drop policy if exists players_editar on public.players;
create policy players_editar on public.players
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists players_crear on public.players;
create policy players_crear on public.players
  for insert to authenticated
  with check (auth.uid() = id);

-- 2) Por si la tabla presencia no quedó bien
drop policy if exists pres_leer on public.presencia;
create policy pres_leer on public.presencia for select to authenticated using (true);
drop policy if exists pres_mia on public.presencia;
create policy pres_mia on public.presencia for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- 3) Asegurar que todos los que tienen cuenta tengan fila en players
--    (por si alguien se registró antes de que existiera el trigger)
insert into public.players (id, email, username)
select u.id, u.email, split_part(u.email,'@',1)
from auth.users u
where not exists (select 1 from public.players p where p.id = u.id);

-- ============================================================
--  LISTO. Ahora buscar y agregar amigos funciona.
-- ============================================================
