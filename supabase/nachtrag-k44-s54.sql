-- Einmalige Korrektur: Matches, die vor dem Katalog-Eintrag importiert wurden.
--
-- The Judgment (K44) und Aurora Stardotter (S54) kannte die App beim Import
-- noch nicht. Der Tracker-Import legt in dem Fall trotzdem an, was er hat:
-- eigene Runden landen als "Anderer Killer" bzw. "Anderer Survivor", und beim
-- Gegner bleibt die Spalte leer (dort stand nur die Warnung in der Vorschau).
-- Der Katalog-Eintrag allein ändert daran nichts – in der Zeile steht weiter
-- "other_killer". Aus der ID lässt sich der Charakter nicht zurückholen, darum
-- diese Liste: die Startzeiten stammen aus derselben Tracker-Antwort.
--
-- Anwenden: in Supabase → SQL Editor die ganze Datei einfügen und einmal
-- ausführen. Die eigene Benutzer-ID steht nur in der ersten Anweisung, sonst
-- nirgends. Ohne sie würden auch die Matches der Freunde angefasst, die zur
-- selben Sekunde gespielt haben.
--
-- Danach ist nichts weiter zu tun: Perks, Add-ons und Kraft hingen schon an den
-- Matches, nur der Charakter fehlte.

-- Wessen Matches? Entweder die eigene ID aus Supabase → Authentication → Users
-- eintragen …
create temporary table repair_user as
select '00000000-0000-0000-0000-000000000000'::uuid as id;

-- … oder die Zeile darüber durch diese hier ersetzen, dann sucht die Abfrage
-- die ID selbst (die Adresse ist die, mit der man sich in der App anmeldet):
--
--   create temporary table repair_user as
--   select user_id as id from public.profiles where email = 'meine@adresse.de';

-- Selbst als The Judgment gespielt (bisher "Anderer Killer")
update public.matches
   set killer = 'judgment'
 where user_id = (select id from repair_user)
   and role = 'killer'
   and killer = 'other_killer'
   and played_at in (
     '2026-08-26T10:16:40Z',   -- Grim Pantry
     '2026-08-26T09:47:11Z',   -- Badham Preschool I
     '2026-08-26T09:19:47Z',   -- Eyrie of Crows
     '2026-08-25T20:16:35Z',   -- Father Campbell's Chapel
     '2026-08-25T20:01:51Z'    -- Mount Ormond Resort
   );

-- Als Survivor gegen The Judgment gespielt (Gegner war leer geblieben)
update public.matches
   set faced_killer = 'judgment'
 where user_id = (select id from repair_user)
   and role = 'survivor'
   and faced_killer is null
   and played_at in (
     '2026-08-26T19:26:10Z',   -- Coal Tower
     '2026-08-26T12:48:22Z',   -- Ironworks of Misery
     '2026-08-26T12:15:36Z',   -- Treatment Theater
     '2026-08-26T10:29:29Z',   -- The Game
     '2026-08-26T07:14:29Z',   -- Coal Tower
     '2026-08-25T19:48:48Z',   -- Garden of Joy
     '2026-08-25T19:39:26Z',   -- Wreckers' Yard
     '2026-08-25T19:26:51Z'    -- The Underground Complex
   );

-- Selbst als Aurora Stardotter gespielt (bisher "Anderer Survivor")
update public.matches
   set survivor = 'aurora'
 where user_id = (select id from repair_user)
   and role = 'survivor'
   and survivor = 'other_survivor'
   and played_at = '2026-08-25T19:39:26Z';   -- Wreckers' Yard

-- Zur Kontrolle: 5 Zeilen mit killer = judgment, 8 mit faced_killer = judgment,
-- davon eine als Aurora.
select played_at, role, killer, survivor, faced_killer
  from public.matches
 where user_id = (select id from repair_user)
   and (killer = 'judgment' or faced_killer = 'judgment' or survivor = 'aurora')
 order by played_at desc;
