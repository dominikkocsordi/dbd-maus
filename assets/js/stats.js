import { supabase } from './supabase.js?v=41';
import { initAuth } from './auth.js?v=41';
import {
  GAME_MODES, KILLERS, SURVIVORS, gameModeLabel, hasPerks, labelFor, maxKills, supportsBuilds,
} from './data.js?v=41';
import { createSorter } from './table-sort.js?v=41';
import {
  aggregate, byCharacter, byPerk, escapeHtml, fmtDate, fmtDay, fmtDecimal, fmtNumber, fmtPercent, killTier, toast,
} from './utils.js?v=41';
import { characterCellHtml, iconHtml, mountIcons, outcomeIconHtml, perkIconHtml } from './images.js?v=41';
import { perkByFile, perkName, perkOwnerLabel } from './perks.js?v=41';

const PAGE_SIZE = 30;
const BP_MAX = 2000000;

let allMatches = [];
let page = 1;
let editingId = null;   // Match, dessen Bearbeitungszeile gerade offen steht

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
    `${fmtNumber(s.kills)} Kills · Ø ${fmtDecimal(s.killsAvg)} · ${fmtNumber(s.merciless)}× alle Kills`;

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

/* Wonach sich die einzelnen Tabellen sortieren lassen. */
const CHARACTER_VALUES = {
  character: (r) => labelFor(r.role, r.id),
  matches: (r) => r.matches,
  hits: (r) => (r.role === 'killer' ? r.stats.kills : r.stats.escapes),
  quote: (r) => (r.role === 'killer' ? r.stats.killRate : r.stats.escapeRate),
  streak: (r) => r.streak.current,
  best: (r) => r.streak.best,
  bp: (r) => r.stats.bloodpoints,
  bpAvg: (r) => r.stats.bloodpointsAvg,
};

const PERK_VALUES = {
  perk: (r) => perkName(r.file ?? ''),
  matches: (r) => r.matches,
  pickrate: (r) => r.pickRate,
  hits: (r) => (r.role === 'killer' ? r.stats.kills : r.stats.escapes),
  quote: (r) => (r.role === 'killer' ? r.stats.killRate : r.stats.escapeRate),
  bpAvg: (r) => r.stats.bloodpointsAvg,
};

const FACED_VALUES = {
  killer: (r) => labelFor('killer', r.id ?? ''),
  matches: (r) => r.total,
  escapes: (r) => r.escapes,
  deaths: (r) => r.deaths,
  rate: (r) => r.rate,
  bpAvg: (r) => r.bpAvg,
};

const MATCH_VALUES = {
  date: (m) => new Date(m.played_at ?? 0).getTime(),
  character: (m) => labelFor(m.role, m.killer ?? m.survivor),
  mode: (m) => gameModeLabel(m.game_mode ?? ''),
  // Ein gemeinsames Maß für beide Rollen: Anteil des Erfolgs am Möglichen.
  result: (m) => (m.role === 'killer' ? (m.kills ?? 0) / maxKills(m.game_mode) : Number(Boolean(m.escaped))),
  bp: (m) => m.bloodpoints,
};

/*
  Jede Tabelle bekommt ihren eigenen Sortierer; ein Klick auf einen Spaltenkopf
  zeichnet die ganze Seite neu. Die Matchliste beginnt dabei wieder auf Seite 1,
  sonst zeigt die aktuelle Seite nach dem Umsortieren auf etwas anderes.
*/
const resort = () => { page = 1; render(); };

const characterSorter = createSorter({ table: '#character-table', values: CHARACTER_VALUES, initial: 'matches', onChange: resort });
const perkSorter = createSorter({ table: '#perk-table', values: PERK_VALUES, initial: 'matches', onChange: resort });
const facedSorter = createSorter({ table: '#faced-table', values: FACED_VALUES, initial: 'matches', onChange: resort });
const matchSorter = createSorter({ table: '#match-table', values: MATCH_VALUES, initial: 'date', onChange: resort });

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

/*
  Auswertung der am Match hinterlegten Perks: wie oft gespielt, mit welcher
  Kill- bzw. Escape-Quote. Ohne Perk-Angaben bleibt die Tafel weg.
*/
function renderPerkTable(filtered) {
  const panel = document.getElementById('perk-panel');

  /*
    Die Pick-Rate misst sich an den Matches derselben Rolle, an denen Perks
    hängen – Matches ohne Angabe können weder für noch gegen einen Perk zählen.
  */
  const pool = { killer: 0, survivor: 0 };
  filtered.forEach((m) => { if ((m.perks ?? []).length) pool[m.role] += 1; });

  const rows = byPerk(filtered).map((r) => ({
    ...r,
    pickRate: pool[r.role] ? (r.matches / pool[r.role]) * 100 : null,
  }));

  panel.hidden = rows.length === 0;
  if (!rows.length) return;

  document.getElementById('perk-count').textContent =
    `${fmtNumber(rows.length)} Perks aus ${fmtNumber(pool.killer + pool.survivor)} Matches mit Angabe`;

  document.getElementById('perk-body').innerHTML = perkSorter.apply(rows).map(({ file, role, matches: count, stats, pickRate }) => {
    const killer = role === 'killer';
    const hits = killer ? stats.kills : stats.escapes;
    const quote = killer ? stats.killRate : stats.escapeRate;
    return `
      <tr>
        <td data-label="Perk">
          <span class="perk-cell">
            ${perkIconHtml(file, perkName(file))}
            <span class="perk-cell__text">
              <span class="perk-cell__name">${escapeHtml(perkName(file))}</span>
              <span class="perk-cell__meta">${escapeHtml(perkOwnerLabel(perkByFile(file)) ?? (killer ? 'Killer' : 'Survivor'))}</span>
            </span>
          </span>
        </td>
        <td data-label="Matches" class="num">${fmtNumber(count)}</td>
        <td data-label="Pick-Rate" class="num">${pickRate === null ? '–' : fmtPercent(pickRate)}</td>
        <td data-label="Kills / Escapes" class="num">${fmtNumber(hits)}</td>
        <td data-label="Quote" class="num"><span class="quote ${quote >= 50 ? 'quote--high' : 'quote--low'}">${fmtPercent(quote)}</span></td>
        <td data-label="Ø BP" class="num">${stats.bloodpointsAvg === null ? '–' : fmtNumber(stats.bloodpointsAvg)}</td>
      </tr>`;
  }).join('');
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

  body.innerHTML = facedSorter.apply(rows).map((r) => `
    <tr>
      <td data-label="Killer">${characterCellHtml('killer', r.id, labelFor('killer', r.id))}</td>
      <td data-label="Matches" class="num">${fmtNumber(r.total)}</td>
      <td data-label="Entkommen" class="num"><span class="tally tally--good">${iconHtml('escape')}${fmtNumber(r.escapes)}</span></td>
      <td data-label="Gestorben" class="num"><span class="tally tally--bad">${iconHtml('sacrificed')}${fmtNumber(r.deaths)}</span></td>
      <td data-label="Escape-Rate" class="num"><span class="quote ${r.rate >= 50 ? 'quote--high' : 'quote--low'}">${fmtPercent(r.rate)}</span></td>
      <td data-label="Ø BP" class="num">${fmtNumber(r.bpAvg)}</td>
    </tr>`).join('');
}

/** Seitenzahl anzeigen und die Pfeile an den Enden abschalten. */
function renderPager(total, pages) {
  const pager = document.getElementById('match-pager');
  pager.hidden = pages <= 1;

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  document.getElementById('page-info').textContent =
    `Seite ${fmtNumber(page)} von ${fmtNumber(pages)} · ${fmtNumber(first)}–${fmtNumber(last)}`;

  document.getElementById('page-prev').disabled = page <= 1;
  document.getElementById('page-next').disabled = page >= pages;
}

// -------------------------------------------------- Bearbeiten in der Liste --

/** ISO-Zeitstempel -> Wert für <input type="datetime-local"> in lokaler Zeit. */
function toLocalInput(iso) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

const optionTags = (entries, selected) => entries
  .map((e) => `<option value="${escapeHtml(String(e.id))}"${String(e.id) === String(selected) ? ' selected' : ''}>${escapeHtml(e.label)}</option>`)
  .join('');

/** Kill-Auswahl passend zum Modus – 2v8 geht bis acht. */
function killOptions(mode, kills) {
  const entries = Array.from({ length: maxKills(mode) + 1 }, (_, n) => ({ id: n, label: `${n}K` }));
  return optionTags(entries, kills ?? 0);
}

/*
  Die Zeile unter dem Match: alles, was sich ohne Rollen-, Build- oder
  Perk-Wechsel ändern lässt. Für den Rest führt ein Link ins volle Formular.
*/
function editRowHtml(m) {
  const killer = m.role === 'killer';
  const characters = killer ? KILLERS : SURVIVORS;

  return `
    <tr class="edit-row" data-edit-row="${escapeHtml(m.id)}">
      <td colspan="7">
        <form class="inline-edit" data-edit-form>
          <div class="inline-edit__grid">
            <label class="field">
              <span class="field__label">Zeitpunkt</span>
              <input type="datetime-local" name="played_at" value="${toLocalInput(m.played_at)}" required>
            </label>

            <label class="field">
              <span class="field__label">Gamemode</span>
              <select name="game_mode">${optionTags(GAME_MODES, m.game_mode)}</select>
            </label>

            <label class="field">
              <span class="field__label">${killer ? 'Killer' : 'Survivor'}</span>
              <select name="character">${optionTags(characters, m.killer ?? m.survivor)}</select>
            </label>

            ${killer ? `
            <label class="field">
              <span class="field__label">Kills</span>
              <select name="kills" data-kills>${killOptions(m.game_mode, m.kills)}</select>
            </label>` : `
            <label class="field">
              <span class="field__label">Ergebnis</span>
              <select name="escaped">
                <option value="true"${m.escaped ? ' selected' : ''}>Entkommen</option>
                <option value="false"${m.escaped ? '' : ' selected'}>Gestorben</option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Gegner</span>
              <select name="faced_killer">
                <option value="">Unbekannt</option>
                ${optionTags(KILLERS, m.faced_killer ?? '')}
              </select>
            </label>`}

            <label class="field">
              <span class="field__label">Blutpunkte</span>
              <input type="number" name="bloodpoints" min="0" max="${BP_MAX}" step="1000" value="${Number(m.bloodpoints ?? 0)}">
            </label>

            <label class="field inline-edit__notes">
              <span class="field__label">Notiz</span>
              <input type="text" name="notes" maxlength="280" value="${escapeHtml(m.notes ?? '')}">
            </label>
          </div>

          <div class="inline-edit__actions">
            <button type="submit" class="btn btn--primary btn--sm">Speichern</button>
            <button type="button" class="btn btn--ghost btn--sm" data-edit-cancel>Abbrechen</button>
            <a class="btn btn--ghost btn--sm" href="index.html?edit=${encodeURIComponent(m.id)}">Im Formular öffnen</a>
            <span class="inline-edit__hint">Rolle, Build und Perks ändert man im Formular.</span>
          </div>
        </form>
      </td>
    </tr>`;
}

/** Speichert die Zeile und pflegt das Ergebnis in die geladene Liste ein. */
async function saveEditRow(match, form) {
  const data = new FormData(form);
  const playedAt = String(data.get('played_at') ?? '');
  const mode = String(data.get('game_mode') ?? '');

  if (!playedAt) { toast('Bitte einen Zeitpunkt angeben.', 'error'); return; }

  const patch = {
    played_at: new Date(playedAt).toISOString(),
    game_mode: mode,
    bloodpoints: Math.min(BP_MAX, Math.max(0, Number(data.get('bloodpoints')) || 0)),
    notes: String(data.get('notes') ?? '').trim() || null,
  };

  if (match.role === 'killer') {
    patch.killer = String(data.get('character'));
    patch.kills = Number(data.get('kills'));
  } else {
    patch.survivor = String(data.get('character'));
    patch.escaped = data.get('escaped') === 'true';
    patch.faced_killer = String(data.get('faced_killer') ?? '') || null;
  }

  // Ein Moduswechsel kann Perks oder Build ungültig machen.
  if (!hasPerks(mode)) patch.perks = null;
  if (!supportsBuilds(mode)) patch.build_id = null;

  const button = form.querySelector('[type="submit"]');
  button.disabled = true;

  const { error } = await supabase.from('matches').update(patch).eq('id', match.id);
  button.disabled = false;

  if (error) {
    toast(`Speichern fehlgeschlagen: ${error.message}`, 'error');
    return;
  }

  Object.assign(match, patch);
  editingId = null;
  toast('Match aktualisiert.', 'success');
  render();
}

/** Verdrahtet die offene Bearbeitungszeile neu, nachdem die Tabelle stand. */
function wireEditRow(body) {
  body.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editingId = editingId === btn.dataset.edit ? null : btn.dataset.edit;
      render();
    });
  });

  const form = body.querySelector('[data-edit-form]');
  if (!form) return;

  const match = allMatches.find((m) => m.id === editingId);
  if (!match) return;

  // Der Modus bestimmt, wie viele Kills überhaupt möglich sind.
  const kills = form.querySelector('[data-kills]');
  if (kills) {
    form.querySelector('[name="game_mode"]').addEventListener('change', (event) => {
      kills.innerHTML = killOptions(event.target.value, Math.min(Number(kills.value), maxKills(event.target.value)));
    });
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); saveEditRow(match, form); });
  form.querySelector('[data-edit-cancel]').addEventListener('click', () => { editingId = null; render(); });

  form.querySelector('input, select')?.focus();
}

function renderMatchList(filtered) {
  const body = document.getElementById('match-body');
  const sorted = matchSorter.apply(filtered);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // Nach einem Filterwechsel kann die aktuelle Seite ins Leere zeigen.
  page = Math.min(Math.max(1, page), pages);
  const shown = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  document.getElementById('match-count').textContent = `${fmtNumber(filtered.length)} Matches`;
  renderPager(filtered.length, pages);

  if (!shown.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">Keine Matches für diesen Filter.</td></tr>';
    return;
  }

  // Ist das offene Match nicht mehr in Sicht, schließt sich die Zeile.
  if (editingId && !shown.some((m) => m.id === editingId)) editingId = null;

  body.innerHTML = shown.map((m) => {
    const result = m.role === 'killer'
      ? `<span class="pill pill--k${killTier(m.kills, m.game_mode)}">${m.kills}K</span>`
      : outcomeIconHtml(m.escaped);
    const open = m.id === editingId;

    return `
      <tr${open ? ' class="is-editing"' : ''}>
        <td data-label="Datum">${fmtDate(m.played_at)}</td>
        <td data-label="Charakter">${characterCellHtml(m.role, m.killer ?? m.survivor, labelFor(m.role, m.killer ?? m.survivor),
          m.faced_killer ? `vs ${labelFor('killer', m.faced_killer)}` : (m.role === 'killer' ? 'Killer' : 'Survivor'))}</td>
        <td data-label="Gamemode">${escapeHtml(gameModeLabel(m.game_mode))}</td>
        <td data-label="Ergebnis">${result}</td>
        <td data-label="BP" class="num">${fmtNumber(m.bloodpoints)}</td>
        <td data-label="Notiz" class="notes">${escapeHtml(m.notes ?? '')}</td>
        <td data-label="Aktion" class="num">
          <button type="button" class="icon-btn${open ? ' is-active' : ''}" data-edit="${escapeHtml(m.id)}"
                  aria-expanded="${open}" title="Bearbeiten" aria-label="Match bearbeiten">&#9998;</button>
        </td>
      </tr>${open ? editRowHtml(m) : ''}`;
  }).join('');

  wireEditRow(body);
}

function render() {
  const filtered = applyFilters();
  const rows = characterRows(filtered);

  document.getElementById('filter-summary').textContent = filterSummary(filtered);
  renderKpis(filtered);
  renderCharacterTable(characterSorter.apply(rows));
  renderPerkTable(filtered);
  renderFacedKillers(filtered);
  renderTopBars(rows);
  renderMatchList(filtered);
}

// -------------------------------------------------------------------- Daten --

async function loadMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, played_at, role, game_mode, killer, kills, survivor, escaped, faced_killer, perks, bloodpoints, notes')
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

  const renderFromStart = () => { page = 1; render(); };

  els.role.addEventListener('change', () => { fillCharacterSelect(); renderFromStart(); });
  els.range.addEventListener('change', () => { syncRangeFields(); renderFromStart(); });
  [els.character, els.mode, els.from, els.to].forEach((el) => el.addEventListener('change', renderFromStart));

  document.getElementById('page-prev').addEventListener('click', () => { page -= 1; render(); });
  document.getElementById('page-next').addEventListener('click', () => { page += 1; render(); });

  els.reset.addEventListener('click', () => {
    els.role.value = 'all';
    els.mode.value = 'all';
    els.range.value = 'all';
    els.from.value = '';
    els.to.value = '';
    syncRangeFields();
    fillCharacterSelect();
    renderFromStart();
  });
}

initFilters();
mountIcons();
initAuth({
  onLogin: () => loadMatches(),
  onLogout: () => { allMatches = []; },
});
