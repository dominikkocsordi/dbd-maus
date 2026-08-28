-- Einmalige Korrektur: Matches, die vor dem Katalog-Eintrag importiert wurden.
--
-- The Judgment (K44) und Aurora Stardotter (S54) kannte die App beim Import
-- noch nicht. Der Tracker-Import legt in dem Fall trotzdem an, was er hat:
-- eigene Runden landen als "Anderer Killer" bzw. "Anderer Survivor", und beim
-- Gegner bleibt die Spalte leer (dort stand nur die Warnung in der Vorschau).
-- Aus der ID allein lässt sich das hinterher nicht mehr aufdröseln – darum
-- diese Liste: die Startzeiten stammen aus derselben Tracker-Antwort.
--
-- Vor dem Ausführen die eigene Benutzer-ID einsetzen: die Nullen-UUID unten
-- überall ersetzen (Supabase → Authentication → Users). Ohne sie würde die
-- Abfrage auch die Matches der Freunde anfassen, die zufällig zur selben
-- Sekunde gespielt haben.
--
-- Danach ist nichts weiter zu tun: Perks, Add-ons und Kraft hingen schon an den
-- Matches, nur der Charakter fehlte.

-- Selbst als The Judgment gespielt (bisher "Anderer Killer")
update public.matches
   set killer = 'judgment'
 where user_id = '00000000-0000-0000-0000-000000000000'
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
 where user_id = '00000000-0000-0000-0000-000000000000'
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
 where user_id = '00000000-0000-0000-0000-000000000000'
   and role = 'survivor'
   and survivor = 'other_survivor'
   and played_at = '2026-08-25T19:39:26Z';   -- Wreckers' Yard

-- Zur Kontrolle: sollte 5 / 8 / 1 Zeilen ergeben.
select role, killer, survivor, faced_killer, played_at
  from public.matches
 where user_id = '00000000-0000-0000-0000-000000000000'
   and (killer = 'judgment' or faced_killer = 'judgment' or survivor = 'aurora')
 order by played_at desc;
