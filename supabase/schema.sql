-- ============================================================================
--  DBD Stats Tracker – Supabase Schema
--  Einspielen: Supabase Dashboard -> SQL Editor -> New query -> Run
--  Das Skript ist idempotent und kann mehrfach ausgeführt werden.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabelle: matches
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,

  played_at    timestamptz not null default now(),
  role         text        not null check (role in ('killer', 'survivor')),
  game_mode    text        not null default 'public',

  -- Nur bei role = 'killer'
  killer       text,
  kills        smallint check (kills between 0 and 4),

  -- Nur bei role = 'survivor'
  survivor     text,
  escaped      boolean,

  bloodpoints  integer not null default 0
                 check (bloodpoints >= 0 and bloodpoints <= 2000000),
  notes        text check (notes is null or char_length(notes) <= 500),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Rollenabhängige Pflichtfelder erzwingen
  constraint matches_role_fields check (
    (role = 'killer'
       and killer is not null and kills is not null
       and survivor is null and escaped is null)
    or
    (role = 'survivor'
       and survivor is not null and escaped is not null
       and killer is null and kills is null)
  )
);

comment on table  public.matches            is 'Einzelne Dead-by-Daylight-Matches pro Benutzer';
comment on column public.matches.game_mode  is 'public | 2v8 | chaos_shuffle | event | custom | other';
comment on column public.matches.kills      is 'Anzahl Kills (0-4), nur für role = killer';
comment on column public.matches.escaped    is 'Entkommen ja/nein, nur für role = survivor';

-- ---------------------------------------------------------------------------
-- 2) Indizes
-- ---------------------------------------------------------------------------
create index if not exists matches_user_played_idx on public.matches (user_id, played_at desc);
create index if not exists matches_user_role_idx   on public.matches (user_id, role);
create index if not exists matches_killer_idx      on public.matches (user_id, killer)   where killer   is not null;
create index if not exists matches_survivor_idx    on public.matches (user_id, survivor) where survivor is not null;

-- ---------------------------------------------------------------------------
-- 3) updated_at automatisch pflegen
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Row Level Security – jeder sieht/ändert ausschließlich eigene Matches
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

drop policy if exists "matches_select_own" on public.matches;
create policy "matches_select_own"
  on public.matches for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "matches_insert_own" on public.matches;
create policy "matches_insert_own"
  on public.matches for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "matches_update_own" on public.matches;
create policy "matches_update_own"
  on public.matches for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own"
  on public.matches for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5) user_id serverseitig setzen (Client muss ihn nicht mitschicken)
-- ---------------------------------------------------------------------------
create or replace function public.matches_set_user_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is null then
    new.user_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists matches_set_user_id on public.matches;
create trigger matches_set_user_id
  before insert on public.matches
  for each row execute function public.matches_set_user_id();

-- ---------------------------------------------------------------------------
-- 6) Komfort-View: aggregierte Kennzahlen der eigenen Matches
--    (security_invoker => RLS der Basistabelle greift weiterhin)
-- ---------------------------------------------------------------------------
create or replace view public.my_stats
with (security_invoker = true) as
select
  m.user_id,
  count(*)                                                          as matches_total,
  count(*) filter (where m.role = 'killer')                         as killer_matches,
  count(*) filter (where m.role = 'survivor')                       as survivor_matches,
  coalesce(sum(m.bloodpoints), 0)                                   as bloodpoints_total,
  coalesce(sum(m.kills), 0)                                         as kills_total,
  avg(m.kills) filter (where m.role = 'killer')                     as kills_avg,
  count(*) filter (where m.role = 'killer' and m.kills = 4)         as merciless_count,
  count(*) filter (where m.role = 'survivor' and m.escaped)         as escapes_total,
  case
    when count(*) filter (where m.role = 'survivor') > 0
    then count(*) filter (where m.role = 'survivor' and m.escaped)::numeric
         / count(*) filter (where m.role = 'survivor') * 100
  end                                                               as escape_rate
from public.matches m
group by m.user_id;

grant select on public.my_stats to authenticated;
