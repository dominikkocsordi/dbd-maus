import { supabase } from './supabase.js?v=9';
import { initAuth } from './auth.js?v=9';
import { GAME_MODES, KILLERS, SURVIVORS, gameModeLabel, labelFor } from './data.js?v=9';
import {
  aggregate, byCharacter, escapeHtml, fmtDate, fmtDecimal, fmtNumber, fmtPercent, toast,
} from './utils.js?v=9';
import { characterCellHtml, mountIcons } from './images.js?v=9';

const MATCH_LIST_LIMIT = 100;

let allMatches = [];

const els = {
  role: document.getElementById('fl-role'),
  character: document.getElementById('fl-character'),
  mode: document.getElementById('fl-mode'),
  range: document.getElementById('fl-range'),
  reset: document.getElementById('fl-reset'),
};

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

function activeFilters() {
  return {
    role: els.role.value,
    character: els.character.value,
    mode: els.mode.value,
    days: els.range.value === 'all' ? null : Number(els.range.value),
  };
}

function applyFilters() {
  const { role, character, mode, days } = activeFilters();
  const since = days ? Date.now() - days * 86400000 : null;

  return allMatches.filter((m) => {
    if (role !== 'all' && m.role !== role) return false;
    if (character !== 'all' && (m.killer ?? m.survivor) !== character) return false;
    if (mode !== 'all' && m.game_mode !== mode) return false;
    if (since && new Date(m.played_at).getTime() < since) return false;
    return true;
  });
}

function filterSummary(filtered) {
  const { role, character, mode, days } = activeFilters();
  const parts = [`${fmtNumber(filtered.length)} Matches`];

  if (role !== 'all') parts.push(role === 'killer' ? 'Killer' : 'Survivor');
  if (character !== 'all') parts.push(labelFor(role === 'survivor' ? 'survivor' : 'killer', character));
  if (mode !== 'all') parts.push(gameModeLabel(mode));
  if (days) parts.push(`${days} Tage`);

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

function renderCharacterTable(rows) {
  const body = document.getElementById('character-body');

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
      : `<span class="pill ${m.escaped ? 'pill--good' : 'pill--bad'}">${m.escaped ? 'Entkommen' : 'Gestorben'}</span>`;

    return `
      <tr>
        <td data-label="Datum">${fmtDate(m.played_at)}</td>
        <td data-label="Charakter">${characterCellHtml(m.role, m.killer ?? m.survivor, labelFor(m.role, m.killer ?? m.survivor), m.role === 'killer' ? 'Killer' : 'Survivor')}</td>
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
  renderCharacterTable(rows);
  renderTopBars(rows);
  renderMatchList(filtered);
}

// -------------------------------------------------------------------- Daten --

async function loadMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, played_at, role, game_mode, killer, kills, survivor, escaped, bloodpoints, notes')
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

function initFilters() {
  els.mode.innerHTML = '<option value="all">Alle Modi</option>' + optionsHtml(GAME_MODES);
  fillCharacterSelect();

  els.role.addEventListener('change', () => { fillCharacterSelect(); render(); });
  [els.character, els.mode, els.range].forEach((el) => el.addEventListener('change', render));

  els.reset.addEventListener('click', () => {
    els.role.value = 'all';
    els.mode.value = 'all';
    els.range.value = 'all';
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
