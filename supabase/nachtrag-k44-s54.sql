-- Einmalige Korrektur: Runden, die vor dem Katalog-Eintrag importiert wurden.
--
-- The Judgment (K44) und Aurora Stardotter (S54) kannte die App beim Import
-- noch nicht, und der Import schreibt nur, was er kennt. Zwei Dinge fehlen
-- darum in den betroffenen Zeilen, und beide lassen sich aus der Zeile selbst
-- nicht wiederherstellen:
--
--   Charakter  Eigene Runden stehen als "other_killer" bzw. "other_survivor"
--              da, beim Gegner blieb die Spalte leer.
--   Perks      Celestial Witness, Fruits of Your Labor, Salvation's Cry und
--              Boon: Steadfast fielen beim Abgleich durch – in der Vorschau
--              stand "1 Perk(s) nicht im Katalog". Gespeichert wurde die Runde
--              dann mit drei statt vier Perks; in zwei Runden mit gar keinen.
--
-- Kraft, Add-ons und Opfergabe hängen dagegen dran: die speichert der Import
-- als Spiel-ID, unabhängig davon, ob der Katalog sie kennt.
--
-- Ein Update reicht deshalb nicht – die Perks müssten aus dem Tracker
-- nachgereicht werden. Einfacher ist der umgekehrte Weg: die 19 Runden löschen
-- und dieselbe Tracker-Antwort noch einmal importieren. Der Import kennt jetzt
-- alles und schreibt die Zeilen vollständig neu, inklusive Charakter, Perks,
-- Kraft, Add-ons und Opfergabe.
--
-- Reihenfolge (wichtig):
--   1. Sicherstellen, dass die Tracker-Antwort noch zur Hand ist – entweder als
--      kopiertes JSON oder über das Lesezeichen auf der Tracker-Seite. Behaviour
--      hält die Historie nicht ewig vor; ohne sie wären die Runden nach dem
--      Löschen weg.
--   2. Dieses Skript in Supabase → SQL Editor ausführen.
--   3. In der App auf "Aus dem Tracker importieren", JSON einfügen, alle Runden
--      übernehmen. Als Dublette markiert wird jetzt nichts mehr, die Zeilen
--      sind ja fort.
--
-- Die übrigen Runden aus derselben Antwort bleiben unangetastet – dort hat der
-- Import nichts verworfen.

-- Wessen Runden? Entweder die eigene ID aus Supabase → Authentication → Users
-- eintragen …
create temporary table repair_user as
select '00000000-0000-0000-0000-000000000000'::uuid as id;

-- … oder die Zeile darüber durch diese hier ersetzen, dann sucht die Abfrage
-- die ID selbst (die Adresse ist die, mit der man sich in der App anmeldet):
--
--   create temporary table repair_user as
--   select user_id as id from public.profiles where email = 'meine@adresse.de';

-- Erst schauen, was getroffen wird: sollten 19 Zeilen sein.
select played_at, role, killer, survivor, faced_killer, perks
  from public.matches
 where user_id = (select id from repair_user)
   and played_at in (
     '2026-08-26T19:26:10Z',   -- Coal Tower                 Boon: Steadfast, Gegner Judgment
     '2026-08-26T19:21:13Z',   -- Treatment Theater          Boon: Steadfast
     '2026-08-26T13:20:01Z',   -- Midwich Elementary School  Boon: Steadfast
     '2026-08-26T12:48:22Z',   -- Ironworks of Misery        Boon: Steadfast, Gegner Judgment
     '2026-08-26T12:15:36Z',   -- Treatment Theater          Boon: Steadfast, Gegner Judgment
     '2026-08-26T11:02:38Z',   -- Badham Preschool I         Boon: Steadfast
     '2026-08-26T10:29:29Z',   -- The Game                   Boon: Steadfast, Gegner Judgment
     '2026-08-26T10:16:40Z',   -- Grim Pantry                als Judgment, Celestial Witness
     '2026-08-26T09:47:11Z',   -- Badham Preschool I         als Judgment, Celestial Witness
     '2026-08-26T09:19:47Z',   -- Eyrie of Crows             als Judgment, Celestial Witness
     '2026-08-26T07:14:29Z',   -- Coal Tower                 Salvation's Cry, Gegner Judgment
     '2026-08-26T06:55:24Z',   -- Sanctum of Wrath           Fruits of Your Labor
     '2026-08-25T20:16:35Z',   -- Father Campbell's Chapel   als Judgment, Celestial Witness
     '2026-08-25T20:01:51Z',   -- Mount Ormond Resort        als Judgment, alle drei Perks
     '2026-08-25T19:48:48Z',   -- Garden of Joy              Fruits of Your Labor, Gegner Judgment
     '2026-08-25T19:39:26Z',   -- Wreckers' Yard             als Aurora, alle drei Perks, Gegner Judgment
     '2026-08-25T19:26:51Z',   -- The Underground Complex    Fruits of Your Labor, Gegner Judgment
     '2026-08-25T19:16:05Z',   -- Eyrie of Crows             Fruits of Your Labor
     '2026-08-25T19:04:23Z'    -- Nostromo Wreckage          Fruits of Your Labor
   )
 order by played_at desc;

-- Passt die Liste, dieselbe Bedingung noch einmal – diesmal löschend.
delete from public.matches
 where user_id = (select id from repair_user)
   and played_at in (
     '2026-08-26T19:26:10Z', '2026-08-26T19:21:13Z', '2026-08-26T13:20:01Z',
     '2026-08-26T12:48:22Z', '2026-08-26T12:15:36Z', '2026-08-26T11:02:38Z',
     '2026-08-26T10:29:29Z', '2026-08-26T10:16:40Z', '2026-08-26T09:47:11Z',
     '2026-08-26T09:19:47Z', '2026-08-26T07:14:29Z', '2026-08-26T06:55:24Z',
     '2026-08-25T20:16:35Z', '2026-08-25T20:01:51Z', '2026-08-25T19:48:48Z',
     '2026-08-25T19:39:26Z', '2026-08-25T19:26:51Z', '2026-08-25T19:16:05Z',
     '2026-08-25T19:04:23Z'
   );
