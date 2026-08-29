-- Einmalige Korrektur: "judgement" → "judgment".
--
-- Der Katalog in assets/js/data.js kennt den Killer als "judgment"
-- (T_UI_K44_TheJudgment_Portrait.png). Wo beim Nachtragen versehentlich
-- "judgement" in der Datenbank steht, findet die App die ID nicht mehr:
-- Statt Portrait und Label zeigt sie den Rohwert, und in Statistik und
-- Filtern zählen die Runden als eigener, unbekannter Killer.
--
-- Das Skript im SQL-Editor von oben nach unten durchgehen. Es läuft dort mit
-- Service-Rechten, RLS greift also nicht – die Updates fassen die Zeilen
-- aller Benutzer an. Ist das nicht gewollt, bei jedem Update die auskommen-
-- tierte user_id-Zeile mit der eigenen ID aus Supabase → Authentication →
-- Users ergänzen.
--
-- Verglichen wird mit lower(), damit auch "Judgement" oder "JUDGEMENT"
-- mitgenommen werden.

-- ---------------------------------------------------------------------------
-- 1) Erst schauen, was betroffen ist
-- ---------------------------------------------------------------------------
select killer, count(*) as runden
  from public.matches
 where lower(killer) = 'judgement'
 group by killer;

-- ---------------------------------------------------------------------------
-- 2) Korrigieren – eigene Killer-Runden
-- ---------------------------------------------------------------------------
update public.matches
   set killer = 'judgment'
 where lower(killer) = 'judgement';
-- and user_id = '00000000-0000-0000-0000-000000000000';

-- ---------------------------------------------------------------------------
-- 3) Kontrolle: sollte 0 Zeilen liefern
-- ---------------------------------------------------------------------------
select id, played_at, killer
  from public.matches
 where lower(killer) = 'judgement';

-- ---------------------------------------------------------------------------
-- 4) Optional: dieselbe Verschreibung an den übrigen Stellen
--
--    Die Killer-ID steht nicht nur in matches.killer. Wer als Survivor gegen
--    Judgment gespielt hat, hat sie in faced_killer bzw. faced_killer_2
--    stehen; Builds und Prestige führen sie in character. Diese Abfrage zeigt,
--    ob dort ebenfalls etwas zu tun ist.
-- ---------------------------------------------------------------------------
select 'matches.faced_killer'   as stelle, count(*) from public.matches  where lower(faced_killer)   = 'judgement'
union all
select 'matches.faced_killer_2',          count(*) from public.matches  where lower(faced_killer_2) = 'judgement'
union all
select 'builds.character',                count(*) from public.builds   where lower("character")    = 'judgement'
union all
select 'prestige.character',              count(*) from public.prestige where lower("character")    = 'judgement';

-- Steht dort eine Zahl größer 0, die passende Zeile mit ausführen:

-- update public.matches  set faced_killer   = 'judgment' where lower(faced_killer)   = 'judgement';
-- update public.matches  set faced_killer_2 = 'judgment' where lower(faced_killer_2) = 'judgement';
-- update public.builds   set "character"    = 'judgment' where lower("character")    = 'judgement';

-- prestige hat (user_id, role, character) als Primärschlüssel: gibt es die
-- Zeile für 'judgment' schon, scheitert ein blankes Update am Duplikat.
-- Darum den höheren Stand behalten und die falsch geschriebene Zeile löschen.
-- insert into public.prestige (user_id, role, "character", level)
-- select user_id, role, 'judgment', level
--   from public.prestige
--  where lower("character") = 'judgement'
-- on conflict (user_id, role, "character")
-- do update set level = greatest(prestige.level, excluded.level),
--               updated_at = now();
--
-- delete from public.prestige where lower("character") = 'judgement';
