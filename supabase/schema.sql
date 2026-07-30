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
  kills        smallint check (kills between 0 and 8),   -- 2v8 geht bis 8

  -- Nur bei role = 'survivor'
  survivor     text,
  escaped      boolean,
  faced_killer text,          -- optional: gegen welchen Killer gespielt wurde

  bloodpoints  integer not null default 0
                 check (bloodpoints >= 0 and bloodpoints <= 2000000),
  notes        text check (notes is null or char_length(notes) <= 500),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Rollenabhängige Pflichtfelder erzwingen
  constraint matches_role_fields check (
    (role = 'killer'
       and killer is not null and kills is not null
       and survivor is null and escaped is null and faced_killer is null)
    or
    (role = 'survivor'
       and survivor is not null and escaped is not null
       and killer is null and kills is null)
  )
);

-- Nachtrag für bereits bestehende Tabellen (das Skript ist erneut ausführbar):
alter table public.matches add column if not exists faced_killer text;

-- 2v8 kennt acht Survivor, entsprechend sind dort bis zu 8 Kills möglich.
alter table public.matches drop constraint if exists matches_kills_check;
alter table public.matches add constraint matches_kills_check
  check (kills is null or kills between 0 and 8);

alter table public.matches drop constraint if exists matches_role_fields;
alter table public.matches add constraint matches_role_fields check (
  (role = 'killer'
     and killer is not null and kills is not null
     and survivor is null and escaped is null and faced_killer is null)
  or
  (role = 'survivor'
     and survivor is not null and escaped is not null
     and killer is null and kills is null)
);

comment on table  public.matches            is 'Einzelne Dead-by-Daylight-Matches pro Benutzer';
comment on column public.matches.game_mode  is 'public | 2v8 | chaos_shuffle | event | custom | other';
comment on column public.matches.kills      is 'Anzahl Kills (0-4), nur für role = killer';
comment on column public.matches.escaped    is 'Entkommen ja/nein, nur für role = survivor';
comment on column public.matches.faced_killer is 'Optional: gegen welchen Killer gespielt wurde, nur für role = survivor';

-- ---------------------------------------------------------------------------
-- 2) Indizes
-- ---------------------------------------------------------------------------
create index if not exists matches_user_played_idx on public.matches (user_id, played_at desc);
create index if not exists matches_user_role_idx   on public.matches (user_id, role);
create index if not exists matches_killer_idx      on public.matches (user_id, killer)   where killer   is not null;
create index if not exists matches_survivor_idx    on public.matches (user_id, survivor) where survivor is not null;
create index if not exists matches_faced_killer_idx on public.matches (user_id, faced_killer) where faced_killer is not null;

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
-- 6) Builds: gespeicherte Perk-Zusammenstellungen
-- ---------------------------------------------------------------------------
create table if not exists public.builds (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,

  name       text not null check (char_length(trim(name)) between 1 and 60),
  role       text not null check (role in ('killer', 'survivor')),
  character  text,                    -- optional: für welchen Killer/Survivor gedacht
  perks      text[] not null default '{}'
               check (coalesce(array_length(perks, 1), 0) <= 4),
  notes      text check (notes is null or char_length(notes) <= 300),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.builds       is 'Gespeicherte Perk-Builds pro Benutzer';
comment on column public.builds.perks is 'Bis zu 4 Perk-Dateinamen, z. B. {Adrenaline.png}';

create index if not exists builds_user_idx on public.builds (user_id, role, created_at desc);

alter table public.builds enable row level security;

drop policy if exists "builds_select_own" on public.builds;
create policy "builds_select_own" on public.builds for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "builds_insert_own" on public.builds;
create policy "builds_insert_own" on public.builds for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "builds_update_own" on public.builds;
create policy "builds_update_own" on public.builds for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "builds_delete_own" on public.builds;
create policy "builds_delete_own" on public.builds for delete
  to authenticated using (auth.uid() = user_id);

drop trigger if exists builds_set_updated_at on public.builds;
create trigger builds_set_updated_at
  before update on public.builds
  for each row execute function public.set_updated_at();

create or replace function public.builds_set_user_id()
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

drop trigger if exists builds_set_user_id on public.builds;
create trigger builds_set_user_id
  before insert on public.builds
  for each row execute function public.builds_set_user_id();

-- Build optional an ein Match hängen; wird der Build gelöscht, bleibt das Match.
alter table public.matches
  add column if not exists build_id uuid references public.builds (id) on delete set null;

create index if not exists matches_build_idx on public.matches (build_id) where build_id is not null;

/*
  Zusätzlich lassen sich die tatsächlich gespielten Perks direkt am Match
  festhalten – unabhängig davon, ob ein gespeicherter Build dahintersteht.
  In 2v8 gibt es keine Perks, dort bleibt die Spalte leer.
*/
alter table public.matches add column if not exists perks text[];

alter table public.matches drop constraint if exists matches_perks_len;
alter table public.matches add constraint matches_perks_len
  check (perks is null or coalesce(array_length(perks, 1), 0) <= 4);

comment on column public.matches.perks is 'Bis zu 4 gespielte Perks als Dateinamen, z. B. {Adrenaline.png}';

-- Auswertung "Nach Perk" liest über den Array – GIN-Index hält das flott.
create index if not exists matches_perks_idx on public.matches using gin (perks);

-- ---------------------------------------------------------------------------
-- 7) Profile und Rollen
--
--    Rolle vergeben (im SQL-Editor, nach der Registrierung):
--      update public.profiles set role = 'owner' where email = 'kontakt@example.de';
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'user' check (role in ('user', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.profiles      is 'Zusatzdaten und Rolle pro Benutzer';
comment on column public.profiles.role is 'user = normaler Zugang | owner = sieht und pflegt alle Tickets';

-- Profil bei der Registrierung automatisch anlegen. Schlägt das Anlegen des
-- Triggers an fehlenden Rechten fehl, greift der Upsert der App beim Login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when insufficient_privilege then
    raise notice 'Trigger auf auth.users nicht erlaubt – die App legt das Profil beim Login an.';
end;
$$;

-- Bereits registrierte Benutzer nachtragen
insert into public.profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

/*
  Rollenprüfung als security definer: eine Policy auf profiles, die selbst
  profiles abfragt, würde sich sonst endlos rekursiv aufrufen.
*/
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'owner'
  );
$$;

grant execute on function public.is_owner() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  to authenticated using (auth.uid() = user_id or public.is_owner());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert
  to authenticated with check (auth.uid() = user_id and role = 'user');

drop policy if exists "profiles_update_owner" on public.profiles;
create policy "profiles_update_owner" on public.profiles for update
  to authenticated using (public.is_owner()) with check (public.is_owner());

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8) Tickets: Bugs und Verbesserungswünsche
-- ---------------------------------------------------------------------------
create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  kind        text not null check (kind in ('bug', 'feature')),
  title       text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 5 and 4000),
  page        text,                       -- betroffene Seite, z. B. 'stats'

  status      text not null default 'new'
                check (status in ('new', 'in_progress', 'planned', 'done', 'rejected', 'closed')),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  owner_note  text check (owner_note is null or char_length(owner_note) <= 2000),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- Nachtrag für bereits bestehende Tabellen (das Skript ist erneut ausführbar):
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in ('new', 'in_progress', 'planned', 'done', 'rejected', 'closed'));

comment on table  public.tickets            is 'Gemeldete Bugs und Verbesserungswünsche';
comment on column public.tickets.owner_note is 'Antwort bzw. Notiz der Besitzerrolle';
comment on column public.tickets.status     is 'closed = vom Melder endgültig geschlossen, der Rest ist Sache der Besitzerrolle';

create index if not exists tickets_status_idx on public.tickets (status, created_at desc);
create index if not exists tickets_user_idx   on public.tickets (user_id, created_at desc);

alter table public.tickets enable row level security;

-- Lesen: eigene Tickets, die Besitzerrolle sieht alle
drop policy if exists "tickets_select" on public.tickets;
create policy "tickets_select" on public.tickets for select
  to authenticated using (auth.uid() = user_id or public.is_owner());

-- Einreichen: nur für sich selbst, immer im Status "new"
drop policy if exists "tickets_insert_own" on public.tickets;
create policy "tickets_insert_own" on public.tickets for insert
  to authenticated with check (auth.uid() = user_id and status = 'new');

/*
  Der Melder darf zweierlei: nachbessern, solange das Ticket unbearbeitet ist,
  und es jederzeit endgültig schließen. Die with-check-Bedingung lässt als
  Ergebnis nur 'new' oder 'closed' zu – den Status weiterzudrehen bleibt damit
  Sache der Besitzerrolle. Dass ein bereits bearbeitetes Ticket dabei nicht
  heimlich auf 'new' zurückfällt, stellt der Trigger unten sicher (eine Policy
  allein kann alten und neuen Stand nicht miteinander vergleichen).
*/
drop policy if exists "tickets_update_own_new" on public.tickets;
drop policy if exists "tickets_update_own" on public.tickets;
create policy "tickets_update_own" on public.tickets for update
  to authenticated
  using (auth.uid() = user_id and status <> 'closed')
  with check (auth.uid() = user_id and status in ('new', 'closed'));

drop policy if exists "tickets_update_owner" on public.tickets;
create policy "tickets_update_owner" on public.tickets for update
  to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "tickets_delete" on public.tickets;
create policy "tickets_delete" on public.tickets for delete
  to authenticated using ((auth.uid() = user_id and status = 'new') or public.is_owner());

create or replace function public.tickets_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is null then
    new.user_id = auth.uid();
  end if;

  new.updated_at = now();

  /*
    Ohne Besitzerrolle ist die einzige erlaubte Statusänderung das Schließen –
    und ein geschlossenes Ticket bleibt zu. Am Text darf der Melder nur
    schrauben, solange noch niemand daran gearbeitet hat.
  */
  if tg_op = 'UPDATE' and not public.is_owner() then
    if old.status = 'closed' then
      raise exception 'Dieses Ticket ist geschlossen und kann nicht mehr geändert werden.';
    end if;

    if new.status is distinct from old.status and new.status <> 'closed' then
      raise exception 'Den Status ändert nur die Besitzerrolle.';
    end if;

    if old.status <> 'new'
       and (new.title, new.description, new.kind, new.page)
           is distinct from (old.title, old.description, old.kind, old.page) then
      raise exception 'Bearbeiten geht nur, solange das Ticket unbearbeitet ist.';
    end if;
  end if;

  -- Abschlusszeitpunkt automatisch mitführen
  if new.status in ('done', 'rejected', 'closed') then
    new.resolved_at = coalesce(new.resolved_at, now());
  else
    new.resolved_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_before_write on public.tickets;
create trigger tickets_before_write
  before insert or update on public.tickets
  for each row execute function public.tickets_before_write();

-- ---------------------------------------------------------------------------
-- 9) Komfort-View: aggregierte Kennzahlen der eigenen Matches
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
