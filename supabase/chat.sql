-- ============================================================
--  EDTU — CHAT DE USUARIOS (amigos, en línea, mensajes)
--  Supabase → SQL Editor → New query → pega TODO → Run
--  Se puede correr varias veces sin romper nada.
-- ============================================================

-- 1) AMISTADES ------------------------------------------------
--    Una fila por relación. 'estado' = 'pendiente' o 'aceptada'.
--    de_id = quien mandó la solicitud, a_id = quien la recibe.
create table if not exists public.amistades (
  id        bigint generated always as identity primary key,
  de_id     uuid references auth.users(id) on delete cascade,
  a_id      uuid references auth.users(id) on delete cascade,
  estado    text default 'pendiente',   -- pendiente | aceptada
  created_at timestamptz default now(),
  unique (de_id, a_id)
);

-- 2) MENSAJES DE USUARIOS -------------------------------------
--    Mensajes entre dos jugadores (chat privado) o al canal general.
create table if not exists public.mensajes (
  id        bigint generated always as identity primary key,
  de_id     uuid references auth.users(id) on delete cascade,
  a_id      uuid references auth.users(id) on delete cascade,  -- null = canal general
  texto     text,
  created_at timestamptz default now()
);

-- 3) PRESENCIA (quién está en línea) --------------------------
--    Cada jugador actualiza su 'ultimo_visto' cada poco. Si fue hace
--    menos de ~1 minuto, se considera EN LÍNEA.
create table if not exists public.presencia (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text,
  ultimo_visto timestamptz default now()
);

-- 4) SEGURIDAD (RLS) ------------------------------------------
alter table public.amistades  enable row level security;
alter table public.mensajes   enable row level security;
alter table public.presencia  enable row level security;

-- Amistades: puedes ver/crear/cambiar las tuyas (donde participas)
drop policy if exists amis_rw on public.amistades;
create policy amis_rw on public.amistades for all to authenticated
  using (auth.uid() = de_id or auth.uid() = a_id)
  with check (auth.uid() = de_id or auth.uid() = a_id);

-- Mensajes: puedes ver los tuyos (enviados o recibidos) y el canal general
drop policy if exists msg_leer on public.mensajes;
create policy msg_leer on public.mensajes for select to authenticated
  using (a_id is null or auth.uid() = de_id or auth.uid() = a_id);
drop policy if exists msg_crear on public.mensajes;
create policy msg_crear on public.mensajes for insert to authenticated
  with check (auth.uid() = de_id);

-- Presencia: todos la pueden VER (para la lista de en línea); cada quien
-- solo actualiza LA SUYA.
drop policy if exists pres_leer on public.presencia;
create policy pres_leer on public.presencia for select to authenticated using (true);
drop policy if exists pres_mia on public.presencia;
create policy pres_mia on public.presencia for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- 5) EN VIVO (realtime) — que los mensajes lleguen al instante
do $$ begin alter publication supabase_realtime add table public.mensajes;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.amistades;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.presencia;  exception when duplicate_object then null; end $$;

-- 6) BUSCAR JUGADORES por nombre (para agregar amigos) --------
--    Una función segura que devuelve id + nombre de quien coincida.
create or replace function public.buscar_jugadores(q text)
returns table(id uuid, username text)
language sql security definer as $$
  select p.id, p.username from public.players p
  where p.username ilike '%'||q||'%' and p.id <> auth.uid()
  limit 20;
$$;

-- ============================================================
--  LISTO. Con esto el chat de amigos funciona:
--  buscar jugadores, mandar solicitud, aceptar, chatear y ver en línea.
-- ============================================================
