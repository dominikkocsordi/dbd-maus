import { supabase } from './supabase.js?v=19';
import { initAuth } from './auth.js?v=19';
import { GAME_MODES, KILLERS, SURVIVORS, gameModeLabel, labelFor } from './data.js?v=19';
import {
  aggregate, byCharacter, escapeHtml, fmtDate, fmtDay, fmtDecimal, fmtNumber, fmtPercent, toast,
} from './utils.js?v=19';
import { characterCellHtml, iconHtml, mountIcons } from './images.js?v=19';

const MATCH_LIST_LIMIT = 100;

let allMatches = [];

const els = {
  role: document.getElementById('fl-role'),
  character: document.getElementById('fl-character'),
  mode: document.getElementById('fl-mode'),
  range: document.getElementById('fl-range'),
  from: document.getElementById('fl-from'),
  to: document.getElementById('fl-to'),
  reset: document.getElementById('fl-reset'),
};

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

// ------------------------------------------------------------------ Filter --

function optionsHtml(entries) {
  return entries.map((e) => `<option value="${e.id}">${escapeHtml(e.label)}</option>`).join('');
}

function fillCharacterSelect() {
  const role = els.role.value;
  const previous = els.character.value;

  let html = '<option value="all">Alle Charaktere</option>';
  if (role === 'killer') {
    html += optionsHtml(KILLERS);
  } else if (role === 'survivor') {
    html += optionsHtml(SURVIVORS);
  } else {
    html += `<optgroup label="Killer">${optionsHtml(KILLERS)}</optgroup>`;
    html += `<optgroup label="Survivor">${optionsHtml(SURVIVORS)}</optgroup>`;
  }

  els.character.innerHTML = html;
  els.character.value = [...els.character.options].some((o) => o.value === previous) ? previous : 'all';
}

/** Zeitfenster als [von, bis] in Millisekunden; null = offen. */
function activeWindow() {
  const range = els.range.value;

  if (range === 'today') return [startOfToday(), null];
  if (range === 'custom') {
    // "Bis" schließt den ganzen Tag ein, nicht nur 00:00 Uhr.
    const from = els.from.value ? new Date(`${els.from.value}T00:00:00`).getTime() : null;
    const to = els.to.value ? new Date(`${els.to.value}T23:59:59.999`).getTime() : null;
    return [from, to];
  }
  if (range === 'all') return [null, null];
  return [Date.now() - Number(range) * 86400000, null];
}

function activeFilters() {
  return {
    role: els.role.value,
    character: els.character.value,
    mode: els.mode.value,
    range: els.range.value,
  };
}

function applyFilters() {
  const { role, character, mode } = activeFilters();
  const [from, to] = activeWindow();

  return allMatches.filter((m) => {
    if (role !== 'all' && m.role !== role) return false;
    if (character !== 'all' && (m.killer ?? m.survivor) !== character) return false;
    if (mode !== 'all' && m.game_mode !== mode) return false;

    const played = new Date(m.played_at).getTime();
    if (from !== null && played < from) return false;
    if (to !== null && played > to) return false;
    return true;
  });
}

function rangeLabel() {
  const range = els.range.value;
  if (range === 'all') return null;
  if (range === 'today') return 'heute';
  if (range !== 'custom') return `${range} Tage`;

  const from = els.from.value ? fmtDay(els.from.value) : null;
  const to = els.to.value ? fmtDay(els.to.value) : null;
  if (from && to) return `${from} – ${to}`;
  if (from) return `ab ${from}`;
  if (to) return `bis ${to}`;
  return null;
}

function filterSummary(filtered) {
  const { role, character, mode } = activeFilters();
  const parts = [`${fmtNumber(filtered.length)} Matches`];

  if (role !== 'all') parts.push(role === 'killer' ? 'Killer' : 'Survivor');
  if (character !== 'all') parts.push(labelFor(role === 'survivor' ? 'survivor' : 'killer', character));
  if (mode !== 'all') parts.push(gameModeLabel(mode));

  const range = rangeLabel();
  if (range) parts.push(range);

  return parts.join(' · ');
}

// ------------------------------------------------------------------ Render --

function renderKpis(filtered) {
  const s = aggregate(filtered);

  document.getElementById('kpi-total').textContent = fmtNumber(s.total);
  document.getElementById('kpi-split').textContent =
    `${fmtNumber(s.killerMatches)} Killer · ${fmtNumber(s.survivorMatches)} Survivor`;

  document.getElementById('kpi-killrate').textContent = fmtPercent(s.killRate);
  document.getElementById('kpi-kills').textContent =
    `${fmtNumber(s.kills)} Kills · Ø ${fmtDecimal(s.killsAvg)} · ${fmtNumber(s.merciless)}× 4K`;

  document.getElementById('kpi-escaperate').textContent = fmtPercent(s.escapeRate);
  document.getElementById('kpi-escapes').textContent =
    `${fmtNumber(s.escapes)} ${s.escapes === 1 ? 'Escape' : 'Escapes'} bei ${fmtNumber(s.survivorMatches)} ${s.survivorMatches === 1 ? 'Trial' : 'Trials'}`;

  document.getElementById('kpi-bp').textContent = fmtNumber(s.bloodpoints);
  document.getElementById('kpi-bp-avg').textContent =
    s.bloodpointsAvg === null ? 'noch keine Daten' : `Ø ${fmtNumber(s.bloodpointsAvg)} pro Match`;
}

function characterRows(filtered) {
  const role = els.role.value;
  const roles = role === 'all' ? ['killer', 'survivor'] : [role];

  return roles
    .flatMap((r) => byCharacter(filtered, r).map((entry) => ({ ...entry, role: r })))
    .sort((a, b) => b.matches - a.matches);
}

/*
  Sortierung der Charakter-Tabelle. Leere Werte (etwa eine Quote ohne Matches)
  rutschen mit -1 ans Ende, statt die Reihenfolge durcheinanderzubringen.
*/
const SORT_VALUES = {
  character: (r) => labelFor(r.role, r.id),
  matches: (r) => r.matches,
  hits: (r) => (r.role === 'killer' ? r.stats.kills : r.stats.escapes),
  quote: (r) => (r.role === 'killer' ? r.stats.killRate : r.stats.escapeRate) ?? -1,
  streak: (r) => r.streak.current,
  best: (r) => r.streak.best,
  bp: (r) => r.stats.bloodpoints,
  bpAvg: (r) => r.stats.bloodpointsAvg ?? -1,
};

let sort = { key: 'matches', dir: 'desc' };

function sortRows(rows) {
  const value = SORT_VALUES[sort.key] ?? SORT_VALUES.matches;
  const factor = sort.dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    const diff = typeof x === 'string' ? x.localeCompare(y, 'de') : x - y;
    // Gleichstand: die häufiger gespielten Charaktere zuerst.
    return diff !== 0 ? diff * factor : b.matches - a.matches;
  });
}

function syncSortHeaders() {
  document.querySelectorAll('#character-table .th-sort').forEach((btn) => {
    const active = btn.dataset.sort === sort.key;
    btn.classList.toggle('is-sorted', active);
    btn.classList.toggle('is-asc', active && sort.dir === 'asc');
    btn.closest('th').setAttribute('aria-sort', active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  });

  document.getElementById('ch-sort').value = sort.key;
  document.getElementById('ch-sort-dir').innerHTML = sort.dir === 'asc' ? '&#9650;' : '&#9660;';
}

/** Dieselbe Spalte erneut = Richtung drehen, sonst sinnvolle Startrichtung. */
function setSort(key) {
  sort = sort.key === key
    ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: key === 'character' ? 'asc' : 'desc' };
  render();
}

function renderCharacterTable(rows) {
  const body = document.getElementById('character-body');
  syncSortHeaders();

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">Keine Matches für diesen Filter.</td></tr>';
    return;
  }

  // Serien gelten je Gamemode – ist kein Modus gefiltert, steht daneben, aus
  // welchem Modus der Wert stammt.
  const showMode = els.mode.value === 'all';

  body.innerHTML = rows.map(({ id, role, matches: count, stats, streak }) => {
    const hits = role === 'killer' ? stats.kills : stats.escapes;
    const quote = role === 'killer' ? stats.killRate : stats.escapeRate;
    const roleLabel = role === 'killer' ? 'Killer' : 'Survivor';
    const modeTag = (mode) => (showMode && mode ? `<span class="mode-tag">${escapeHtml(gameModeLabel(mode))}</span>` : '');

    return `
      <tr>
        <td data-label="Charakter">${characterCellHtml(role, id, labelFor(role, id), roleLabel)}</td>
        <td data-label="Matches" class="num">${fmtNumber(count)}</td>
        <td data-label="Kills / Escapes" class="num">${fmtNumber(hits)}</td>
        <td data-label="Quote" class="num"><span class="quote ${quote >= 50 ? 'quote--high' : 'quote--low'}">${fmtPercent(quote)}</span></td>
        <td data-label="Serie" class="num">${streak.current > 0 ? `<span class="streak-badge">&#128293;${fmtNumber(streak.current)}</span>${modeTag(streak.currentMode)}` : '–'}</td>
        <td data-label="Beste" class="num">${streak.best > 0 ? `${fmtNumber(streak.best)}${modeTag(streak.bestMode)}` : '–'}</td>
        <td data-label="BP" class="num">${fmtNumber(stats.bloodpoints)}</td>
        <td data-label="Ø BP" class="num">${stats.bloodpointsAvg === null ? '–' : fmtNumber(stats.bloodpointsAvg)}</td>
      </tr>`;
  }).join('');
}

function renderTopBars(rows) {
  const container = document.getElementById('top-bars');
  const top = rows.slice(0, 8);

  if (!top.length) {
    container.innerHTML = '<p class="empty">Keine Daten.</p>';
    return;
  }

  const max = Math.max(...top.map((r) => r.matches));
  container.innerHTML = top.map((r) => `
    <div class="bar">
      <span class="bar__label">${characterCellHtml(r.role, r.id, labelFor(r.role, r.id))}</span>
      <span class="bar__track"><span class="bar__fill bar__fill--${r.role}" style="width:${(r.matches / max) * 100}%"></span></span>
      <span class="bar__value">${fmtNumber(r.matches)}</span>
    </div>`).join('');
}

/** Ergebnisse als Survivor, aufgeschlüsselt nach gespieltem Gegner-Killer. */
function renderFacedKillers(filtered) {
  const panel = document.getElementById('faced-panel');
  const body = document.getElementById('faced-body');

  const groups = new Map();
  for (const m of filtered) {
    if (m.role !== 'survivor' || !m.faced_killer) continue;
    if (!groups.has(m.faced_killer)) groups.set(m.faced_killer, []);
    groups.get(m.faced_killer).push(m);
  }

  const rows = [...groups.entries()]
    .map(([id, list]) => {
      const escapes = list.filter((m) => m.escaped).length;
      const bp = list.reduce((sum, m) => sum + (m.bloodpoints ?? 0), 0);
      return { id, total: list.length, escapes, deaths: list.length - escapes, rate: (escapes / list.length) * 100, bpAvg: bp / list.length };
    })
    .sort((a, b) => b.total - a.total || b.rate - a.rate);

  panel.hidden = rows.length === 0;
  if (!rows.length) return;

  body.innerHTML = rows.map((r) => `
    <tr>
      <td data-label="Killer">${characterCellHtml('killer', r.id, labelFor('killer', r.id))}</td>
      <td data-label="Matches" class="num">${fmtNumber(r.total)}</td>
      <td data-label="Entkommen" class="num"><span class="tally tally--good">${iconHtml('escape')}${fmtNumber(r.escapes)}</span></td>
      <td data-label="Gestorben" class="num"><span class="tally tally--bad">${iconHtml('sacrificed')}${fmtNumber(r.deaths)}</span></td>
      <td data-label="Escape-Rate" class="num"><span class="quote ${r.rate >= 50 ? 'quote--high' : 'quote--low'}">${fmtPercent(r.rate)}</span></td>
      <td data-label="Ø BP" class="num">${fmtNumber(r.bpAvg)}</td>
    </tr>`).join('');
}

/* Als Survivor sagt das Icon alles – der Text daneben wäre nur Platz weg. */
const outcomePill = (escaped) => {
  const label = escaped ? 'Entkommen' : 'Gestorben';
  // Der Haken bzw. das Kreuz springt ein, falls das Icon nicht lädt.
  const icon = escaped ? iconHtml('escape', '\u2713') : iconHtml('sacrificed', '\u2715');
  return `<span class="pill pill--icon ${escaped ? 'pill--good' : 'pill--bad'}" title="${label}">`
    + `${icon}<span class="sr-only">${label}</span></span>`;
};

function renderMatchList(filtered) {
  const body = document.getElementById('match-body');
  const shown = filtered.slice(0, MATCH_LIST_LIMIT);

  document.getElementById('match-count').textContent = filtered.length > MATCH_LIST_LIMIT
    ? `${fmtNumber(MATCH_LIST_LIMIT)} von ${fmtNumber(filtered.length)}`
    : `${fmtNumber(filtered.length)} Matches`;

  if (!shown.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">Keine Matches für diesen Filter.</td></tr>';
    return;
  }

  body.innerHTML = shown.map((m) => {
    const result = m.role === 'killer'
      ? `<span class="pill pill--k${m.kills}">${m.kills}K</span>`
      : outcomePill(m.escaped);

    return `
      <tr>
        <td data-label="Datum">${fmtDate(m.played_at)}</td>
        <td data-label="Charakter">${characterCellHtml(m.role, m.killer ?? m.survivor, labelFor(m.role, m.killer ?? m.survivor),
          m.faced_killer ? `vs ${labelFor('killer', m.faced_killer)}` : (m.role === 'killer' ? 'Killer' : 'Survivor'))}</td>
        <td data-label="Gamemode">${escapeHtml(gameModeLabel(m.game_mode))}</td>
        <td data-label="Ergebnis">${result}</td>
        <td data-label="BP" class="num">${fmtNumber(m.bloodpoints)}</td>
        <td data-label="Notiz" class="notes">${escapeHtml(m.notes ?? '')}</td>
        <td data-label="Aktion" class="num">
          <a class="icon-btn" href="index.html?edit=${encodeURIComponent(m.id)}" title="Bearbeiten" aria-label="Match bearbeiten">&#9998;</a>
        </td>
      </tr>`;
  }).join('');
}

function render() {
  const filtered = applyFilters();
  const rows = characterRows(filtered);

  document.getElementById('filter-summary').textContent = filterSummary(filtered);
  renderKpis(filtered);
  renderCharacterTable(sortRows(rows));
  renderFacedKillers(filtered);
  renderTopBars(rows);
  renderMatchList(filtered);
}

// -------------------------------------------------------------------- Daten --

async function loadMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, played_at, role, game_mode, killer, kills, survivor, escaped, faced_killer, bloodpoints, notes')
    .order('played_at', { ascending: false })
    .limit(2000);

  if (error) {
    toast(`Daten konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  allMatches = data ?? [];
  render();
}

// --------------------------------------------------------------------- Init --

function syncRangeFields() {
  const custom = els.range.value === 'custom';
  document.getElementById('fl-from-field').hidden = !custom;
  document.getElementById('fl-to-field').hidden = !custom;
}

function initFilters() {
  els.mode.innerHTML = '<option value="all">Alle Modi</option>' + optionsHtml(GAME_MODES);
  fillCharacterSelect();
  syncRangeFields();

  els.role.addEventListener('change', () => { fillCharacterSelect(); render(); });
  els.range.addEventListener('change', () => { syncRangeFields(); render(); });
  [els.character, els.mode, els.from, els.to].forEach((el) => el.addEventListener('change', render));

  document.querySelectorAll('#character-table .th-sort').forEach((btn) => {
    btn.addEventListener('click', () => setSort(btn.dataset.sort));
  });

  document.getElementById('ch-sort').addEventListener('change', (event) => {
    sort = { key: event.target.value, dir: sort.dir };
    render();
  });
  document.getElementById('ch-sort-dir').addEventListener('click', () => {
    sort = { key: sort.key, dir: sort.dir === 'asc' ? 'desc' : 'asc' };
    render();
  });

  els.reset.addEventListener('click', () => {
    els.role.value = 'all';
    els.mode.value = 'all';
    els.range.value = 'all';
    els.from.value = '';
    els.to.value = '';
    syncRangeFields();
    fillCharacterSelect();
    render();
  });
}

initFilters();
mountIcons();
initAuth({
  onLogin: () => loadMatches(),
  onLogout: () => { allMatches = []; },
});
