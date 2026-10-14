-- Zweite Korrektur: Haunted-by-Daylight-Runden, die noch als "Event-Modus"
-- gespeichert sind.
--
-- Der erste Nachtrag hat nur Runden erwischt, deren Notiz genau
-- "SeasonalEvent (offizieller Tracker)" lautet. Runden mit anderer oder
-- leerer Notiz (z. B. eine anders benannte Warteschlange oder von Hand
-- eingetragen) sind dabei im Event-Modus geblieben.
--
-- Im Oktober/November 2026 läuft kein anderes Event als Haunted by Daylight,
-- darum gilt hier jede Event-Runde aus diesem Zeitraum als Haunted by
-- Daylight. Tracker-Notizen ("… (offizieller Tracker)") fallen weg, eigene
-- Notizen bleiben stehen.
--
-- Ausführen in Supabase → SQL Editor. Zuerst prüfen, was betroffen ist:

select id, played_at, role, notes
  from public.matches
 where game_mode = 'event'
   and played_at >= '2026-10-01'
   and played_at <  '2026-12-01'
 order by played_at;

-- Dann korrigieren:

update public.matches
   set game_mode = 'haunted_by_daylight',
       notes     = case when notes like '%(offizieller Tracker)' then null else notes end
 where game_mode = 'event'
   and played_at >= '2026-10-01'
   and played_at <  '2026-12-01';
