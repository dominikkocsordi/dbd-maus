// Übersetzt die offizielle Match-History (stats.deadbydaylight.com) in Zeilen
// für die Tabelle `matches`.
//
// Die Rohdaten liefert das Behaviour-Backend als Array:
//   GET account-backend.bhvr.com/player-stats/match-history/games/dbd/providers/bhvr
//
// Ein Eintrag beschreibt die eigene Runde (`playerStat`) plus die übrigen
// Mitspieler (`opponentStat`): Wer Killer war, findet dort vier Survivor, wer
// Survivor war, die drei anderen und den Killer. In 2v8 ist das Feld größer –
// acht Survivor und zwei Killer. Das Modul rechnet nur um und spricht selbst
// weder mit Behaviour noch mit Supabase.

import {
  KILLERS, SURVIVORS, hasClasses, hasKillerDuo, hasLoadoutExtras, hasPerks, maxKills,
  supportsBuilds,
} from './data.js?v=70';
import { PERKS } from './perks.js?v=70';
import { cleanAddons, loadoutEntry } from './loadout.js?v=70';

export const TRACKER_ENDPOINT =
  'https://account-backend.bhvr.com/player-stats/match-history/games/dbd/providers/bhvr';

/** Rollen-Schlüssel des Spiels ("Camper" ist intern der Survivor). */
const ROLES = { VE_Slasher: 'killer', VE_Camper: 'survivor' };

/** Nur wer entkommt, zählt nicht als Kill – alles andere endet im Nichts. */
const ESCAPED = 'VE_Escaped';

/*
  Bekannte Warteschlangen. Behaviour benennt die Modifier intern nach Essen –
  die Tracker-Seite kennt neben "Regular" noch Calamari, Cake, ChocolateBox und
  Firefly. Welcher Deckname zu welchem Modus gehört, verrät nur der Vergleich
  mit dem eigenen Spielverlauf – bestätigt sind Calamari, ChocolateBox und
  Firefly.

  Alles Unbekannte landet als Event-Modus in der App, der Deckname bleibt dann
  in den Notizen stehen – daran lässt sich der nächste Eintrag hier ablesen.
*/
const GAME_MODES = {
  Online: 'public',
  Regular: 'public',
  Calamari: '2v8',
  ChocolateBox: 'chaos_shuffle',
  Firefly: 'lights_out',
};

/*
  Zweiter Weg über den Anzeigenamen: Der Deckname wechselt womöglich mit dem
  nächsten Durchlauf, "2V8" steht aber so im Export. Damit bleibt der Modus
  auch dann erkannt, wenn die Warteschlange plötzlich anders heißt.
*/
const GAME_MODE_NAMES = { '2v8': '2v8' };

/** Modus der App zum Eintrag des Trackers – Unbekanntes wird zum Event-Modus. */
function gameMode(id, name) {
  return GAME_MODES[id] ?? GAME_MODE_NAMES[norm(name)] ?? 'event';
}

const BP_MAX = 2000000;

/*
  Vereinheitlicht Namen für den Abgleich: ohne Akzente, ohne Sonderzeichen,
  klein. Das führende "Hex:" fällt weg, weil der Tracker es mitschickt, der
  Perk-Katalog der App aber nicht.
*/
function norm(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/^\s*hex:\s*/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/*
  Letzte Rettung beim Perk-Abgleich: Schreibweisen unterscheiden sich oft nur in
  doppelten Buchstaben ("Chilli"/"Chili", "Till"/"'Til", "Man's"/"Man"). Werden
  Doppelungen auf beiden Seiten zusammengezogen, treffen sie sich wieder.
*/
const squeeze = (value) => value.replace(/(.)\1+/g, '$1');

// ------------------------------------------------------------- Charaktere --

/*
  Der Tracker benennt Charaktere uneinheitlich: mal als Code ("K33", "S49"),
  mal mit einem alten internen Namen ("Gunslinger", "Bob", "Killer07"). Beides
  lässt sich aus den Portrait-Dateinamen in data.js ableiten – der Code steht
  vorn, der ausgeschriebene Name dahinter. Neue Charaktere werden dadurch
  automatisch erkannt, sobald sie dort mit Portrait eingetragen sind.
*/
const PORTRAIT = /^(?:T_UI_)?([KS]\d+)_(.+)_Portrait\.png$/;

function characterIndex(list) {
  const index = new Map();
  for (const entry of list) {
    const parts = PORTRAIT.exec(entry.file ?? '');
    if (!parts) continue;                    // "Anderer Killer" hat kein Portrait
    index.set(parts[1].toLowerCase(), entry.id);       // K19
    index.set(norm(parts[2]), entry.id);               // TheDeathslinger
  }
  return index;
}

const CHARACTERS = {
  killer: characterIndex(KILLERS),
  survivor: characterIndex(SURVIVORS),
};

/** Charakter-ID der App, oder null wenn der Katalog ihn (noch) nicht kennt. */
function findCharacter(role, entry) {
  const index = CHARACTERS[role];
  if (!index) return null;
  return index.get(String(entry?.id ?? '').toLowerCase())
    ?? index.get(norm(entry?.name))
    ?? null;
}

// ------------------------------------------------------------------ Perks --

const PERK_INDEX = (() => {
  const exact = new Map();
  const loose = new Map();

  for (const perk of PERKS) {
    // Der Tracker schickt mal den Anzeigenamen, mal den internen Schlüssel –
    // letzterer entspricht oft dem Dateinamen im Bucket.
    for (const key of [norm(perk.name), norm(perk.file.replace(/\.png$/i, ''))]) {
      if (!key) continue;
      if (!exact.has(`${perk.role}:${key}`)) exact.set(`${perk.role}:${key}`, perk.file);
      const fuzzy = `${perk.role}:${squeeze(key)}`;
      if (!loose.has(fuzzy)) loose.set(fuzzy, perk.file);
    }
  }

  return { exact, loose };
})();

/** Dateiname des Perks im Bucket, oder null wenn er im Katalog fehlt. */
function findPerk(role, entry) {
  const keys = [norm(entry?.name), norm(entry?.id)].filter(Boolean);

  for (const key of keys) {
    const hit = PERK_INDEX.exact.get(`${role}:${key}`);
    if (hit) return hit;
  }
  for (const key of keys) {
    const hit = PERK_INDEX.loose.get(`${role}:${squeeze(key)}`);
    if (hit) return hit;
  }
  return null;
}

// ------------------------------------------------------------------ Match --

/**
 * Rechnet einen Tracker-Eintrag in eine Zeile für `matches` um.
 * Rückgabe: { payload, warnings, source } oder { error } wenn nichts zu holen ist.
 */
function convert(entry) {
  const stat = entry?.playerStat;
  const match = entry?.matchStat;
  if (!stat || !match) return { error: 'Eintrag ohne Spieldaten' };

  const role = ROLES[stat.playerRole];
  if (!role) return { error: `Unbekannte Rolle: ${stat.playerRole ?? '–'}` };

  const seconds = Number(match.matchStartTime);
  if (!Number.isFinite(seconds) || seconds <= 0) return { error: 'Eintrag ohne Startzeit' };
  const playedAt = new Date(seconds * 1000);
  if (Number.isNaN(playedAt.getTime())) return { error: 'Unlesbare Startzeit' };

  // Gekürzt, damit ein unerwartet langer Wert nicht am Längenlimit der
  // Notiz-Spalte scheitert.
  const rawMode = String(match.gameType?.id ?? '').slice(0, 60);
  const mode = gameMode(rawMode, match.gameType?.name);
  const character = findCharacter(role, stat.characterName);
  const warnings = [];

  if (!character) {
    warnings.push(`Charakter unbekannt: ${stat.characterName?.name ?? stat.characterName?.id ?? '–'}`);
  }

  const payload = {
    played_at: playedAt.toISOString(),
    game_mode: mode,
    role,
    bloodpoints: Math.min(Math.max(Math.round(Number(stat.bloodpointsEarned) || 0), 0), BP_MAX),
    // Der Modus geht sonst verloren: die App kennt nur "Event-Modus", welches
    // Event es war, steht danach nur noch hier.
    notes: mode === 'event' && rawMode ? `${rawMode} (offizieller Tracker)` : null,
    killer: null,
    kills: null,
    survivor: null,
    escaped: null,
    faced_killer: null,
    faced_killer_2: null,
    character_class: null,
    build_id: null,
    perks: null,
    item: null,
    offering: null,
    addons: null,
  };

  /*
    In 2v8 gibt das Spiel die Perks vor und stellt die Klasse an ihre Stelle.
    Sie gehört damit zur Ausrüstung der Runde und wird wie ein Item gespeichert:
    die Spiel-ID ans Match, Name und Symbol in den Katalog.
  */
  if (hasClasses(mode)) payload.character_class = stat.characterClass?.id ?? null;

  if (role === 'killer') {
    payload.killer = character ?? 'other_killer';

    // Der Tracker verrät den eigenen Ausgang als Killer nicht – die Kills
    // ergeben sich aus den Survivorn, die nicht entkommen sind.
    const field = (entry.opponentStat ?? []).filter((o) => ROLES[o.playerRole] === 'survivor');

    if (!field.length) {
      warnings.push('Keine Gegnerdaten – Kills nicht ermittelbar');
      payload.kills = 0;
    } else {
      if (field.some((o) => !o.playerStatus?.id)) warnings.push('Ausgang einzelner Survivor unbekannt');
      payload.kills = Math.min(
        field.filter((o) => o.playerStatus?.id !== ESCAPED).length,
        maxKills(mode),
      );
    }
  } else {
    payload.survivor = character ?? 'other_survivor';

    const status = stat.playerStatus?.id;
    if (!status) warnings.push('Eigener Ausgang unbekannt – als gestorben gewertet');
    payload.escaped = status === ESCAPED;

    /*
      In 2v8 stehen zwei Killer auf dem Feld – beide gehören ans Match, in der
      Reihenfolge, in der der Tracker sie nennt. Außerhalb von 2v8 gibt es nur
      einen; ein zweiter wäre dort ein Datenfehler und bleibt darum liegen.
    */
    const versus = (entry.opponentStat ?? []).filter((o) => ROLES[o.playerRole] === 'killer');
    const slots = hasKillerDuo(mode) ? ['faced_killer', 'faced_killer_2'] : ['faced_killer'];

    versus.slice(0, slots.length).forEach((opponent, slot) => {
      const facedKiller = findCharacter('killer', opponent.characterName);
      if (facedKiller) payload[slots[slot]] = facedKiller;
      else warnings.push(`Gegnerischer Killer unbekannt: ${opponent.characterName?.name ?? '–'}`);
    });

    /*
      Kennt der Katalog den ersten Killer nicht, den zweiten aber schon, stünde
      sonst der zweite allein da – die Spalten sind der Reihe nach belegt.
    */
    if (!payload.faced_killer && payload.faced_killer_2) {
      payload.faced_killer = payload.faced_killer_2;
      payload.faced_killer_2 = null;
    }

    if (hasKillerDuo(mode) && versus.length < 2) warnings.push('Nur ein Killer im Eintrag');
  }

  /*
    Ausrüstung: Der Tracker liefert dieselben Spiel-IDs, die auch der Katalog
    führt – sie werden unverändert übernommen. Was der Katalog noch nicht kennt,
    wird trotzdem gespeichert und später über die ID benannt.
  */
  const loadout = stat.characterLoadout ?? {};
  payload.item = loadout.power?.id ?? null;

  // In Lights Out und 2v8 gibt es nur das Item bzw. die Kraft – was der Tracker
  // dort an Add-ons oder Opfergabe meldet, gehört nicht ins Match.
  const extras = hasLoadoutExtras(mode);
  payload.offering = extras ? loadout.offering?.id ?? null : null;

  const addons = extras ? cleanAddons((loadout.addOns ?? []).map((addon) => addon?.id)) : [];
  if (addons.length) payload.addons = addons;

  /*
    Nebenbei lernt der Import den Katalog dazu: Der Tracker nennt zu jedem Teil
    Namen und Bildpfad. Die Add-ons bekommen die Gruppe der Power bzw. des Items,
    mit dem sie gespielt wurden – so stehen sie beim Eintragen von Hand später an
    der richtigen Stelle.
  */
  const group = loadoutEntry('item', payload.item)?.group ?? payload.item ?? null;
  const catalog = [
    learnable('item', loadout.power, role, { group, killer: role === 'killer' ? payload.killer : null }),
    extras ? learnable('offering', loadout.offering, role, {}) : null,
    ...(extras ? loadout.addOns ?? [] : []).map((addon) => learnable('addon', addon, role, { group })),
    /*
      Klassen lernt der Import von allen Beteiligten, nicht nur von sich selbst:
      In einer 2v8-Runde stehen zehn Leute auf dem Feld – ihre Klassen füllen die
      Auswahl im Formular nach einem Import fast von allein.
    */
    ...(hasClasses(mode) ? [stat, ...(entry.opponentStat ?? [])] : [])
      .map((who) => learnable('class', who?.characterClass, ROLES[who?.playerRole], {})),
  ].filter(Boolean);

  if (hasPerks(mode)) {
    const played = (stat.characterLoadout?.perks ?? [])
      .map((perk) => findPerk(role, perk))
      .filter(Boolean)
      .slice(0, 4);
    if (played.length) payload.perks = played;

    const total = (stat.characterLoadout?.perks ?? []).length;
    if (total && played.length < total) warnings.push(`${total - played.length} Perk(s) nicht im Katalog`);
  }

  return {
    payload,
    warnings,
    catalog,
    source: {
      rawMode,
      characterName: stat.characterName?.name ?? null,
      status: stat.playerStatus?.name ?? null,
    },
  };
}

/**
 * Ein Teil aus dem Tracker als Katalogeintrag – oder null, wenn Name, ID oder
 * Rolle fehlen. `image.path` zeigt auf Behaviours Asset-Server und dient als
 * Bild, solange im eigenen Bucket nichts liegt.
 */
function learnable(kind, part, role, extra) {
  if (!part?.id || !part?.name || !role) return null;
  return {
    kind,
    id: part.id,
    name: part.name,
    role,
    path: part.image?.path ?? null,
    ...extra,
  };
}

// -------------------------------------------------------------- Rohdaten --

/**
 * Nimmt entgegen, was aus dem Tracker kommt: das Array selbst, ein Objekt mit
 * dem Array darin oder den JSON-Text drumherum.
 */
export function extractEntries(raw) {
  let value = raw;

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) throw new Error('Es wurde nichts eingefügt.');
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error('Das ist kein gültiges JSON.');
    }
  }

  if (Array.isArray(value)) return value;

  // Falls jemand die Antwort samt Hülle kopiert hat.
  if (value && typeof value === 'object') {
    for (const key of ['matches', 'data', 'results', 'items']) {
      if (Array.isArray(value[key])) return value[key];
    }
  }

  throw new Error('Im JSON steckt keine Match-Liste.');
}

/**
 * Wandelt die Tracker-Antwort in Import-Zeilen um. Reihenfolge: neueste zuerst.
 * Rückgabe: { rows, failed, catalog } – `failed` sammelt Einträge, die nichts
 * hergeben, `catalog` die dabei gelernte Ausrüstung (je ID einmal).
 */
export function parseMatchHistory(raw) {
  const entries = extractEntries(raw);
  const rows = [];
  const failed = [];
  const catalog = new Map();

  for (const entry of entries) {
    const result = convert(entry);
    if (result.error) {
      failed.push(result.error);
      continue;
    }
    rows.push(result);
    for (const part of result.catalog) catalog.set(`${part.kind}:${part.id}`, part);
  }

  rows.sort((a, b) => new Date(b.payload.played_at) - new Date(a.payload.played_at));
  return { rows, failed, catalog: [...catalog.values()] };
}

/** Perks als reihenfolgeunabhängiger Schlüssel, oder null wenn keine da sind. */
const perkKey = (perks) => (perks?.length ? [...perks].sort().join('|') : null);

/**
 * Ordnet den Zeilen gespeicherte Builds zu: Wer dieselben Perks schon einmal
 * als Build abgelegt hat, sieht ihn am importierten Match wieder.
 *
 * In 2v8 und Chaos Shuffle bleibt das Feld leer – dort gibt das Spiel die Perks
 * vor, ein eigener Build steckt also nicht dahinter.
 */
export function attachBuilds(rows, builds) {
  const known = (builds ?? [])
    .map((build) => ({ ...build, key: perkKey(build.perks) }))
    .filter((build) => build.key);

  if (!known.length) return rows;

  return rows.map((row) => {
    const { payload } = row;
    if (!supportsBuilds(payload.game_mode)) return row;

    const key = perkKey(payload.perks);
    if (!key) return row;

    const matching = known.filter((build) => build.role === payload.role && build.key === key);
    // Ein Build für genau diesen Charakter passt besser als ein allgemeiner.
    const character = payload.killer ?? payload.survivor;
    const build = matching.find((entry) => entry.character === character) ?? matching[0];
    if (!build) return row;

    return { ...row, buildName: build.name, payload: { ...payload, build_id: build.id } };
  });
}

/*
  Zwei Einträge gelten als dasselbe Match, wenn Rolle und Startzeit
  zusammenpassen. Die Zeit kommt sekundengenau aus dem Tracker; die Toleranz
  fängt Runden ab, die zuvor von Hand eingetragen wurden.
*/
const DUPLICATE_WINDOW_MS = 3 * 60 * 1000;

/** Markiert Zeilen, zu denen es in `existing` schon ein Match gibt. */
export function markDuplicates(rows, existing) {
  const known = (existing ?? []).map((m) => ({
    role: m.role,
    time: new Date(m.played_at).getTime(),
  }));

  return rows.map((row) => {
    const time = new Date(row.payload.played_at).getTime();
    const duplicate = known.some(
      (m) => m.role === row.payload.role && Math.abs(m.time - time) <= DUPLICATE_WINDOW_MS,
    );

    // Damit ein Import in sich selbst keine Dubletten erzeugt.
    if (!duplicate) known.push({ role: row.payload.role, time });

    return { ...row, duplicate };
  });
}
