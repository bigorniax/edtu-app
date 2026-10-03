-- ============================================================
--  EDTU — CUENTAS DE JUGADORES (Sign up / Sign in)
--
--  Cómo usar: Supabase → SQL Editor → New query → pega TODO → Run
--  Es idempotente: puedes correrlo varias veces sin romper nada.
--
--  ⚠️ IMPORTANTE: esto usa Supabase AUTH, el sistema de cuentas de
--  verdad. Las contraseñas las guarda Supabase ENCRIPTADAS en su propia
--  tabla (auth.users), que nadie puede leer —ni tú, ni yo, ni nadie—.
--  Nosotros solo guardamos el PERFIL y los RÉCORDS, nunca la contraseña.
--
--  Esto es DISTINTO del login por PIN que ya tienes (ese es para la app
--  de espías). Las cuentas de jugadores van por aquí, separadas.
-- ============================================================

-- 1) PERFIL DE CADA JUGADOR -----------------------------------
--    Una fila por jugador. Se enlaza con su cuenta de Supabase Auth
--    por el id. Aquí NO va la contraseña (esa la guarda Supabase solo).
create table if not exists public.players (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text,
  email       text,
  avatar      text,              -- qué muñeco/foto eligió
  created_at  timestamptz default now()
);

-- 2) RÉCORDS DE CADA JUGADOR ----------------------------------
--    El mejor puntaje de cada jugador en cada juego.
--    (player_id + game) juntos no se repiten: un récord por juego y jugador.
create table if not exists public.player_scores (
  id          bigint generated always as identity primary key,
  player_id   uuid references auth.users(id) on delete cascade,
  game        text not null,     -- 'tennis', 'snake', 'flappy'...
  best        int  default 0,
  updated_at  timestamptz default now(),
  unique (player_id, game)
);

-- 3) SEGURIDAD (RLS) — cada jugador solo toca LO SUYO ---------
--    Esta es la parte importante: que un niño NO pueda ver ni cambiar
--    los récords (ni los datos) de otro niño.
alter table public.players       enable row level security;
alter table public.player_scores enable row level security;

-- Perfil: cada quien ve y edita SOLO su propio perfil
drop policy if exists players_propio on public.players;
create policy players_propio on public.players
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Récords propios: cada quien crea/edita SOLO sus récords
drop policy if exists scores_propios on public.player_scores;
create policy scores_propios on public.player_scores
  for all to authenticated
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

-- Récords de TODOS: cualquiera (aunque no tenga cuenta) puede VER los
-- récords, para hacer una tabla de "mejores puntajes del cole". Solo
-- LEER, nunca cambiar los de otro.
drop policy if exists scores_ranking on public.player_scores;
create policy scores_ranking on public.player_scores
  for select to anon, authenticated
  using (true);

-- 4) CREAR EL PERFIL SOLO, AL REGISTRARSE --------------------
--    Cuando alguien se crea una cuenta, esto le crea su fila de perfil
--    automáticamente, sin que tengamos que hacerlo a mano.
create or replace function public.nuevo_jugador()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.players (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_jugador on auth.users;
create trigger al_crear_jugador
  after insert on auth.users
  for each row execute function public.nuevo_jugador();

-- 5) RANKING (vista para la tabla de mejores) ----------------
--    Una lista ordenada del mejor puntaje de cada juego, con el nombre
--    del jugador. Para mostrar "LOS MEJORES DEL COLE".
create or replace view public.ranking as
  select s.game,
         p.username,
         s.best,
         s.updated_at
  from public.player_scores s
  join public.players p on p.id = s.player_id
  order by s.game, s.best desc;

-- ============================================================
--  LISTO. Ahora, en Supabase:
--   1) Authentication → Providers → Email → que esté ENCENDIDO.
--   2) Authentication → Sign In / Up → "Confirm email":
--      para empezar y probar con tus amigos, puedes APAGARLO
--      (así entran al tiro sin tener que revisar el correo).
--      Cuando quieras hacerlo más serio, lo enciendes.
-- ============================================================
