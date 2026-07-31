// Kleine Helfer für Formatierung, Toasts und Statistik-Berechnung.
import { maxKills, streakMinKills } from './data.js?v=31';

const nf = new Intl.NumberFormat('de-DE');
const df = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dayFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

export const fmtNumber = (n) => nf.format(Math.round(Number(n) || 0));
/** Nur das Datum, z. B. für Zeitraum-Angaben ("29.07.26"). */
export const fmtDay = (value) => (value ? dayFmt.format(new Date(value)) : '–');
export const fmtDate = (iso) => (iso ? df.format(new Date(iso)) : '–');

export function fmtPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return `${Number(value).toFixed(digits).replace('.', ',')} %`;
}

export function fmtDecimal(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return Number(value).toFixed(digits).replace('.', ',');
}

/** Zahl aus einem Feld mit Tausenderpunkten lesen ("123.456" -> 123456). */
export function parseNumber(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Farbstufe 0–4 für die Kill-Pille. Dadurch leuchtet ein 8K in 2v8 so
 * kräftig wie ein 4K im normalen Spiel, ein 4K in 2v8 dagegen nur halb.
 */
export const killTier = (kills, mode) => Math.round(((kills ?? 0) / maxKills(mode)) * 4);

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let toastTimer;
export function toast(message, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast toast--${type} is-visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 4000);
}

/**
 * Aggregiert eine Match-Liste zu den Kennzahlen, die überall angezeigt werden.
 */
export function aggregate(matches) {
  const killer = matches.filter((m) => m.role === 'killer');
  const survivor = matches.filter((m) => m.role === 'survivor');

  const kills = killer.reduce((sum, m) => sum + (m.kills ?? 0), 0);
  // Die Quote misst sich am Feld des jeweiligen Modus – in 2v8 also an acht.
  const killSlots = killer.reduce((sum, m) => sum + maxKills(m.game_mode), 0);
  const escapes = survivor.filter((m) => m.escaped).length;
  const bloodpoints = matches.reduce((sum, m) => sum + (m.bloodpoints ?? 0), 0);

  return {
    total: matches.length,
    killerMatches: killer.length,
    survivorMatches: survivor.length,
    bloodpoints,
    bloodpointsAvg: matches.length ? bloodpoints / matches.length : null,
    kills,
    killsAvg: killer.length ? kills / killer.length : null,
    killRate: killSlots ? (kills / killSlots) * 100 : null,
    merciless: killer.filter((m) => m.kills === maxKills(m.game_mode)).length,
    escapes,
    escapeRate: survivor.length ? (escapes / survivor.length) * 100 : null,
  };
}

/**
 * Ein Match zählt für die Serie als Erfolg, wenn man als Survivor entkommen ist
 * bzw. als Killer drei Viertel des Feldes geholt hat (3K normal, 6K in 2v8).
 */
export const isStreakHit = (m) => (m.role === 'killer'
  ? (m.kills ?? 0) >= streakMinKills(m.game_mode)
  : Boolean(m.escaped));

/**
 * Serien für eine nach Datum absteigend sortierte Match-Liste.
 * `current` = laufende Serie ab dem neuesten Match, `best` = längste Serie überhaupt.
 */
export function streakFor(matchesDesc) {
  let current = 0;
  for (const m of matchesDesc) {
    if (!isStreakHit(m)) break;
    current += 1;
  }

  let best = 0;
  let run = 0;
  for (const m of matchesDesc) {
    run = isStreakHit(m) ? run + 1 : 0;
    if (run > best) best = run;
  }

  return { current, best };
}

/**
 * Serien getrennt nach Gamemode – eine Serie läuft immer nur innerhalb eines
 * Modus. `current`/`best` sind die jeweils höchsten Werte über alle Modi,
 * `currentMode`/`bestMode` sagen, in welchem Modus sie stehen.
 */
export function streakByMode(matchesDesc) {
  const groups = new Map();
  for (const m of matchesDesc) {
    if (!groups.has(m.game_mode)) groups.set(m.game_mode, []);
    groups.get(m.game_mode).push(m);
  }

  const modes = [...groups.entries()]
    .map(([mode, list]) => ({ mode, ...streakFor(list) }))
    .sort((a, b) => b.current - a.current || b.best - a.best);

  const top = modes[0] ?? { mode: null, current: 0, best: 0 };
  const bestEntry = modes.reduce((acc, m) => (m.best > (acc?.best ?? -1) ? m : acc), null);

  return {
    modes,
    current: top.current,
    currentMode: top.current > 0 ? top.mode : null,
    best: bestEntry?.best ?? 0,
    bestMode: bestEntry?.best > 0 ? bestEntry.mode : null,
  };
}

/**
 * Gruppiert Matches nach gespieltem Perk. Ein Match zählt in jedem seiner
 * Perks mit – die Summe der Zeilen ist also größer als die Zahl der Matches.
 */
export function byPerk(matches) {
  const groups = new Map();

  for (const m of matches) {
    for (const file of m.perks ?? []) {
      if (!groups.has(file)) groups.set(file, []);
      groups.get(file).push(m);
    }
  }

  return [...groups.entries()]
    .map(([file, list]) => ({
      file,
      role: list[0].role,
      matches: list.length,
      stats: aggregate(list),
    }))
    .sort((a, b) => b.matches - a.matches);
}

/**
 * Gruppiert Matches nach Charakter und liefert eine sortierte Auswertung.
 * Erwartet die Liste nach `played_at` absteigend sortiert (wegen der Serien).
 */
export function byCharacter(matches, role) {
  const key = role === 'killer' ? 'killer' : 'survivor';
  const groups = new Map();

  for (const m of matches) {
    if (m.role !== role || !m[key]) continue;
    if (!groups.has(m[key])) groups.set(m[key], []);
    groups.get(m[key]).push(m);
  }

  return [...groups.entries()]
    .map(([id, list]) => ({
      id,
      matches: list.length,
      stats: aggregate(list),
      streak: streakByMode(list),
    }))
    .sort((a, b) => b.matches - a.matches);
}
