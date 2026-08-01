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

-- ---------------------------------------------------------------------------
-- 10) Prestige: Stufe 0 bis 100 je Charakter
-- ---------------------------------------------------------------------------
/*
  Eine Zeile je Benutzer und Charakter. Charaktere ohne Eintrag stehen
  schlicht auf 0 – deshalb wird nichts vorbefüllt, die Seite ergänzt die
  fehlenden Namen aus data.js selbst.
*/
create table if not exists public.prestige (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('killer', 'survivor')),
  character  text not null check (char_length(character) between 1 and 60),
  level      smallint not null default 0 check (level between 0 and 100),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, role, character)
);

comment on table  public.prestige       is 'Prestige-Stufe je Charakter und Benutzer';
comment on column public.prestige.level is 'Stufe 0 bis 100; 0 entspricht "noch nicht begonnen"';

alter table public.prestige enable row level security;

drop policy if exists "prestige_select_own" on public.prestige;
create policy "prestige_select_own" on public.prestige for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "prestige_insert_own" on public.prestige;
create policy "prestige_insert_own" on public.prestige for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "prestige_update_own" on public.prestige;
create policy "prestige_update_own" on public.prestige for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "prestige_delete_own" on public.prestige;
create policy "prestige_delete_own" on public.prestige for delete
  to authenticated using (auth.uid() = user_id);

drop trigger if exists prestige_set_updated_at on public.prestige;
create trigger prestige_set_updated_at
  before update on public.prestige
  for each row execute function public.set_updated_at();

create or replace function public.prestige_set_user_id()
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

drop trigger if exists prestige_set_user_id on public.prestige;
create trigger prestige_set_user_id
  before insert on public.prestige
  for each row execute function public.prestige_set_user_id();

-- ---------------------------------------------------------------------------
-- 11) Freunde: Code, Freundschaften und geteilte Kennzahlen
--
--     Geteilt werden ausschließlich die Summen aus friend_stats() – die
--     einzelnen Matches samt Notizen bleiben privat.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists display_name text
  check (display_name is null or char_length(trim(display_name)) between 2 and 24);

create unique index if not exists profiles_friend_code_idx on public.profiles (friend_code);

comment on column public.profiles.friend_code  is 'Achtstelliger Code zum Hinzufügen als Freund';
comment on column public.profiles.display_name is 'Optionaler Name für den Freundesvergleich';

-- Acht Hex-Stellen: keine Verwechslung zwischen O/0 oder I/1 möglich.
create or replace function public.profiles_set_friend_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  while new.friend_code is null loop
    new.friend_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    if exists (select 1 from public.profiles p where p.friend_code = new.friend_code) then
      new.friend_code := null;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists profiles_friend_code on public.profiles;
create trigger profiles_friend_code
  before insert on public.profiles
  for each row execute function public.profiles_set_friend_code();

-- Bestehende Profile nachträglich mit einem Code versehen
do $$
declare
  target uuid;
  code text;
begin
  for target in select user_id from public.profiles where friend_code is null loop
    loop
      code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
      exit when not exists (select 1 from public.profiles p where p.friend_code = code);
    end loop;
    update public.profiles set friend_code = code where user_id = target;
  end loop;
end;
$$;

/*
  Den eigenen Anzeigenamen darf jeder setzen; die Rolle bleibt der
  Besitzerrolle vorbehalten (sonst könnte sich jeder selbst befördern).
*/
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_owner() then
    raise exception 'Die Rolle ändert nur die Besitzerrolle.';
  end if;
  if new.friend_code is distinct from old.friend_code then
    raise exception 'Der Freundescode bleibt, wie er ist.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester    uuid not null references auth.users (id) on delete cascade,
  addressee    uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester <> addressee)
);

comment on table public.friendships is 'Freundschaftsanfragen und bestätigte Freundschaften';

-- Ein Paar nur einmal, egal wer angefragt hat
create unique index if not exists friendships_pair_idx on public.friendships
  (least(requester, addressee), greatest(requester, addressee));

create index if not exists friendships_addressee_idx on public.friendships (addressee, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships for select
  to authenticated using (auth.uid() in (requester, addressee));

-- Anfragen laufen über add_friend(); direkt einfügen darf man nur für sich selbst.
drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships for insert
  to authenticated with check (auth.uid() = requester and status = 'pending');

-- Annehmen darf nur, wer gefragt wurde
drop policy if exists "friendships_accept" on public.friendships;
create policy "friendships_accept" on public.friendships for update
  to authenticated
  using (auth.uid() = addressee and status = 'pending')
  with check (auth.uid() = addressee and status = 'accepted');

-- Ablehnen, zurückziehen und entfreunden ist dasselbe: die Zeile fällt weg.
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships for delete
  to authenticated using (auth.uid() in (requester, addressee));

create or replace function public.friendships_touch()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.responded_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists friendships_touch on public.friendships;
create trigger friendships_touch
  before update on public.friendships
  for each row execute function public.friendships_touch();

/*
  Hinzufügen per Code. Läuft als security definer, weil der Code sonst auf
  fremde Profilzeilen zugreifen müsste. Rückgabe ist ein kurzer Status, den
  die App in eine Meldung übersetzt.
*/
create or replace function public.add_friend(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted   text := upper(regexp_replace(coalesce(code, ''), '[^0-9A-Za-z]', '', 'g'));
  target   uuid;
  existing public.friendships%rowtype;
begin
  if auth.uid() is null then return 'unauthorized'; end if;
  if length(wanted) <> 8 then return 'unknown'; end if;

  select p.user_id into target from public.profiles p where p.friend_code = wanted;
  if target is null then return 'unknown'; end if;
  if target = auth.uid() then return 'self'; end if;

  select * into existing from public.friendships f
   where least(f.requester, f.addressee) = least(auth.uid(), target)
     and greatest(f.requester, f.addressee) = greatest(auth.uid(), target);

  if found then
    if existing.status = 'accepted' then return 'already'; end if;
    -- Die Gegenseite hat schon angefragt: dann ist das hier die Zusage.
    if existing.addressee = auth.uid() then
      update public.friendships
         set status = 'accepted', responded_at = now()
       where id = existing.id;
      return 'accepted';
    end if;
    return 'pending';
  end if;

  insert into public.friendships (requester, addressee) values (auth.uid(), target);
  return 'requested';
end;
$$;

grant execute on function public.add_friend(text) to authenticated;

/*
  Offene Anfragen in beide Richtungen, mit Namen der Gegenseite.
*/
create or replace function public.friend_requests()
returns table (
  request_id   uuid,
  direction    text,
  other_id     uuid,
  other_name   text,
  other_email  text,
  asked_at     timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    case when f.requester = auth.uid() then 'out' else 'in' end,
    p.user_id,
    p.display_name,
    p.email,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.user_id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.status = 'pending'
    and auth.uid() in (f.requester, f.addressee)
  order by f.created_at desc;
$$;

grant execute on function public.friend_requests() to authenticated;

/*
  Kennzahlen für den Vergleich: die eigenen und die aller bestätigten Freunde.
  Nur Summen – einzelne Matches, Notizen und Builds bleiben privat.
*/
-- Der Rückgabetyp wächst mit; darum erst weg, dann neu.
drop function if exists public.friend_stats();

create or replace function public.friend_stats()
returns table (
  person_id        uuid,
  link_id          uuid,
  person_name      text,
  person_email     text,
  person_code      text,
  is_self          boolean,
  matches_total    bigint,
  killer_total     bigint,
  survivor_total   bigint,
  kills_total      bigint,
  kill_slots       bigint,
  merciless_total  bigint,
  escapes_total    bigint,
  bloodpoints_total bigint,
  last_played      timestamptz,
  prestige_total   bigint,
  prestige_max     bigint,
  prestige_maxed   bigint,
  prestige_started bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with circle as (
    select auth.uid() as person, null::uuid as link
    union all
    select case when f.requester = auth.uid() then f.addressee else f.requester end, f.id
      from public.friendships f
     where f.status = 'accepted'
       and auth.uid() in (f.requester, f.addressee)
  )
  select
    c.person,
    c.link,
    p.display_name,
    p.email,
    case when c.person = auth.uid() then p.friend_code end,
    c.person = auth.uid(),
    count(m.id),
    count(m.id) filter (where m.role = 'killer'),
    count(m.id) filter (where m.role = 'survivor'),
    coalesce(sum(m.kills), 0),
    coalesce(sum(case when m.role = 'killer' and m.game_mode = '2v8' then 8
                      when m.role = 'killer' then 4 else 0 end), 0),
    count(m.id) filter (
      where m.role = 'killer'
        and m.kills = case when m.game_mode = '2v8' then 8 else 4 end
    ),
    count(m.id) filter (where m.role = 'survivor' and m.escaped),
    coalesce(sum(m.bloodpoints), 0),
    max(m.played_at),
    -- Prestige hängt am Charakter, nicht am Match: als eigene Abfrage je
    -- Person, sonst würde der Join die Match-Summen vervielfachen.
    (select coalesce(sum(pr.level), 0)::bigint from public.prestige pr where pr.user_id = c.person),
    (select coalesce(max(pr.level), 0)::bigint from public.prestige pr where pr.user_id = c.person),
    (select count(*) from public.prestige pr where pr.user_id = c.person and pr.level = 100),
    (select count(*) from public.prestige pr where pr.user_id = c.person and pr.level > 0)
  from circle c
  join public.profiles p on p.user_id = c.person
  left join public.matches m on m.user_id = c.person
  group by c.person, c.link, p.display_name, p.email, p.friend_code;
$$;

grant execute on function public.friend_stats() to authenticated;
