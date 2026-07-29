// Kleine Helfer für Formatierung, Toasts und Statistik-Berechnung.

const nf = new Intl.NumberFormat('de-DE');
const df = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const fmtNumber = (n) => nf.format(Math.round(Number(n) || 0));
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
    killRate: killer.length ? (kills / (killer.length * 4)) * 100 : null,
    merciless: killer.filter((m) => m.kills === 4).length,
    escapes,
    escapeRate: survivor.length ? (escapes / survivor.length) * 100 : null,
  };
}

/** Gruppiert Matches nach Charakter und liefert eine sortierte Auswertung. */
export function byCharacter(matches, role) {
  const key = role === 'killer' ? 'killer' : 'survivor';
  const groups = new Map();

  for (const m of matches) {
    if (m.role !== role || !m[key]) continue;
    if (!groups.has(m[key])) groups.set(m[key], []);
    groups.get(m[key]).push(m);
  }

  return [...groups.entries()]
    .map(([id, list]) => ({ id, matches: list.length, stats: aggregate(list) }))
    .sort((a, b) => b.matches - a.matches);
}
