-- Einmalige Korrektur: Haunted-by-Daylight-Runden, die vor dem eigenen Modus
-- importiert wurden.
--
-- Der Tracker meldet das Halloween-Event als Warteschlange "SeasonalEvent".
-- Die App kannte sie noch nicht und hat die Runden als "Event-Modus"
-- gespeichert, mit "SeasonalEvent (offizieller Tracker)" in den Notizen.
-- Alles andere an der Zeile stimmt – ein Update reicht, ein Neuimport ist
-- nicht nötig (er würde die Runden ohnehin als Dubletten überspringen).
--
-- Eingegrenzt auf Oktober/November 2026, damit ältere saisonale Events im
-- Event-Modus bleiben. Ausführen in Supabase → SQL Editor.

update public.matches
   set game_mode = 'haunted_by_daylight',
       notes     = null
 where game_mode = 'event'
   and notes     = 'SeasonalEvent (offizieller Tracker)'
   and played_at >= '2026-10-01'
   and played_at <  '2026-12-01';
