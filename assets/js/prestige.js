/*
  Prestige: für jeden Killer und Survivor eine Stufe von 0 bis 100.
  Gespeichert wird eine Zeile je Charakter, angezeigt wird das Wappen aus
  crest.js – Farbe alle fünf Stufen, Form alle 25.
*/
import { supabase } from './supabase.js?v=49';
import { initAuth } from './auth.js?v=49';
import { KILLERS, SURVIVORS, labelFor } from './data.js?v=49';
import { MAX_PRESTIGE, MILESTONES, TIERS, crestHtml, crestLabel, crestMilestone } from './crest.js?v=49';
import { avatarHtml, mountIcons } from './images.js?v=49';
import { escapeHtml, fmtNumber, fmtPercent, toast } from './utils.js?v=49';

let currentUser = null;
let levels = new Map();       // "killer:trapper" -> Stufe
let editing = null;           // { role, id, label, level }

const $ = (sel) => document.querySelector(sel);
const keyOf = (role, id) => `${role}:${id}`;
const levelOf = (role, id) => levels.get(keyOf(role, id)) ?? 0;

/* Die Sammelposten "Anderer Killer"/"Anderer Survivor" haben kein Prestige. */
const PLACEHOLDERS = ['other_killer', 'other_survivor'];

/** Alle Charaktere beider Rollen als flache Liste. */
function roster(role = 'all') {
  const parts = [];
  if (role !== 'survivor') parts.push(...KILLERS.map((k) => ({ ...k, role: 'killer' })));
  if (role !== 'killer') parts.push(...SURVIVORS.map((s) => ({ ...s, role: 'survivor' })));
  return parts
    .filter((c) => !PLACEHOLDERS.includes(c.id))
    .map((c) => ({ ...c, level: levelOf(c.role, c.id) }));
}

const ROSTER_SIZE = {
  killer: KILLERS.filter((k) => !PLACEHOLDERS.includes(k.id)).length,
  survivor: SURVIVORS.filter((s) => !PLACEHOLDERS.includes(s.id)).length,
};

// ---------------------------------------------------------------- Kopfzahlen --

function summaryFor(rows) {
  const sum = rows.reduce((total, c) => total + c.level, 0);
  const possible = rows.length * MAX_PRESTIGE;
  return {
    sum,
    possible,
    percent: possible ? (sum / possible) * 100 : 0,
    started: rows.filter((c) => c.level > 0).length,
    maxed: rows.filter((c) => c.level === MAX_PRESTIGE).length,
    best: rows.reduce((top, c) => (c.level > top.level ? c : top), { level: 0 }),
  };
}

function renderSummary() {
  const all = roster();
  const killer = summaryFor(all.filter((c) => c.role === 'killer'));
  const survivor = summaryFor(all.filter((c) => c.role === 'survivor'));
  const total = summaryFor(all);

  $('#page-meta').textContent = total.started
    ? `${fmtNumber(total.started)} von ${fmtNumber(all.length)} Charakteren begonnen`
    : 'Noch nichts eingetragen';

  // Das größte erreichte Wappen steht stellvertretend für den Fortschritt.
  $('#summit-crest').innerHTML = crestHtml(total.best.level, 'crest--xl');
  $('#summit-value').textContent = fmtPercent(total.percent);
  $('#summit-hint').textContent =
    `${fmtNumber(total.sum)} von ${fmtNumber(total.possible)} möglichen Stufen`;
  $('#summit-fill').style.width = `${Math.max(total.percent, total.sum ? 1.5 : 0)}%`;

  $('#kpi-sum').textContent = fmtNumber(total.sum);
  $('#kpi-sum-hint').textContent = total.best.level
    ? `Höchster Stand: ${escapeHtml(labelFor(total.best.role, total.best.id))} auf ${total.best.level}`
    : 'Noch keine Stufe eingetragen';

  const roleHint = (s, count) => `${fmtNumber(s.started)} von ${fmtNumber(count)} begonnen · Ø ${fmtNumber(s.started ? s.sum / s.started : 0)}`;
  $('#kpi-killer').textContent = fmtNumber(killer.sum);
  $('#kpi-killer-hint').textContent = roleHint(killer, ROSTER_SIZE.killer);
  $('#kpi-survivor').textContent = fmtNumber(survivor.sum);
  $('#kpi-survivor-hint').textContent = roleHint(survivor, ROSTER_SIZE.survivor);

  $('#kpi-max').textContent = fmtNumber(total.maxed);
  $('#kpi-max-hint').textContent = total.maxed
    ? `${total.maxed === 1 ? 'Charakter' : 'Charaktere'} auf Prestige 100`
    : 'Noch niemand auf 100';
}

/** Alle Wappen einmal durchdekliniert, als Legende zum System. */
function renderLegend() {
  $('#legend').innerHTML = MILESTONES.map((m) => {
    // Je Formstufe ein Beispiel pro Farbe: das jeweils letzte Level der Fünfergruppe.
    const samples = m.from === m.to
      ? [m.from]
      : Array.from({ length: Math.round((m.to - m.from + 1) / 5) }, (_, i) => Math.min(m.to, m.from + i * 5 + 4));

    return `
      <section class="legend__row">
        <header class="legend__head">
          <span class="legend__label">${escapeHtml(m.label)}</span>
          <span class="legend__range">${m.from === m.to ? `Stufe ${m.from}` : `Stufe ${m.from}–${m.to}`}</span>
        </header>
        <div class="legend__crests">
          ${samples.map((level) => `
            <span class="legend__item">
              ${crestHtml(level)}
              <span class="legend__caption">${escapeHtml(TIERS[Math.floor((level - 1) / 5) % TIERS.length].label)}</span>
            </span>`).join('')}
        </div>
      </section>`;
  }).join('');
}

// -------------------------------------------------------------------- Raster --

function visibleRows() {
  const role = $('#fl-role').value;
  const scope = $('#fl-scope').value;
  const sort = $('#fl-sort').value;
  const term = $('#fl-search').value.trim().toLowerCase();

  const rows = roster(role).filter((c) => {
    if (scope === 'started' && c.level === 0) return false;
    if (scope === 'open' && c.level === MAX_PRESTIGE) return false;
    if (scope === 'max' && c.level !== MAX_PRESTIGE) return false;
    if (term && !c.label.toLowerCase().includes(term)) return false;
    return true;
  });

  const byName = (a, b) => a.label.localeCompare(b.label, 'de');
  if (sort === 'name') return rows.sort(byName);
  if (sort === 'level-asc') return rows.sort((a, b) => a.level - b.level || byName(a, b));
  return rows.sort((a, b) => b.level - a.level || byName(a, b));
}

function renderGrid() {
  const rows = visibleRows();
  const grid = $('#grid');

  $('#grid-count').textContent = `${fmtNumber(rows.length)} ${rows.length === 1 ? 'Charakter' : 'Charaktere'}`;
  $('#grid-empty').hidden = rows.length > 0;

  grid.innerHTML = rows.map((c) => {
    const milestone = crestMilestone(c.level);
    return `
      <button type="button" class="pcard${c.level === MAX_PRESTIGE ? ' pcard--max' : ''}"
              data-role="${c.role}" data-id="${escapeHtml(c.id)}">
        <span class="pcard__portrait">
          ${avatarHtml(c.role, c.id, c.label, 'avatar--xl')}
          <span class="pcard__crest">${crestHtml(c.level, 'crest--sm')}</span>
        </span>
        <span class="pcard__name">${escapeHtml(c.label)}</span>
        <span class="pcard__tier">${c.level ? `Prestige ${c.level}` : 'Noch offen'}</span>
        <span class="pcard__track"><span class="pcard__fill pcard__fill--${milestone?.shape ?? 'none'}"
              style="width:${c.level}%"></span></span>
      </button>`;
  }).join('');

  grid.querySelectorAll('.pcard').forEach((card) => {
    card.addEventListener('click', () => openEditor(card.dataset.role, card.dataset.id));
  });
}

function render() {
  renderSummary();
  renderGrid();
}

// -------------------------------------------------------------------- Editor --

/** Nächste Marke, die noch aussteht – gibt dem Schieber ein Ziel. */
function nextGoalText(level) {
  if (level >= MAX_PRESTIGE) return 'Höher geht es nicht.';

  const nextColour = Math.min(MAX_PRESTIGE, (Math.floor(level / 5) + 1) * 5);
  const nextShape = MILESTONES.find((m) => m.from > level);
  const parts = [`Noch ${nextColour - level} bis Stufe ${nextColour}`];
  if (nextShape) parts.push(`${nextShape.label} ab ${nextShape.from}`);
  return parts.join(' · ');
}

function syncEditor(level) {
  editing.level = Math.min(MAX_PRESTIGE, Math.max(0, Math.round(Number(level) || 0)));

  $('#ed-crest').innerHTML = crestHtml(editing.level, 'crest--xl');
  $('#ed-tier').textContent = crestLabel(editing.level);
  $('#ed-next').textContent = nextGoalText(editing.level);
  $('#ed-range').value = String(editing.level);
  if ($('#ed-number').value !== String(editing.level)) $('#ed-number').value = String(editing.level);

  $('#ed-quick').querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.level) === editing.level);
  });
}

function openEditor(role, id) {
  editing = { role, id, label: labelFor(role, id), level: levelOf(role, id) };

  $('#ed-title').textContent = editing.label;
  syncEditor(editing.level);

  const drawer = $('#editor');
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  $('#ed-range').focus();
}

function closeEditor() {
  const drawer = $('#editor');
  drawer.classList.remove('is-open');
  setTimeout(() => { drawer.hidden = true; }, 200);
  editing = null;
}

async function saveEditor() {
  if (!editing) return;
  const { role, id, level } = editing;
  const button = $('#ed-save');
  button.disabled = true;

  const { error } = await supabase
    .from('prestige')
    .upsert({ user_id: currentUser.id, role, character: id, level }, { onConflict: 'user_id,role,character' });

  button.disabled = false;

  if (error) {
    const missing = /prestige|schema cache|does not exist/i.test(error.message);
    toast(missing
      ? 'Der Datenbank fehlt noch das Update aus supabase/schema.sql.'
      : `Speichern fehlgeschlagen: ${error.message}`, 'error');
    return;
  }

  levels.set(keyOf(role, id), level);
  toast(level ? `${labelFor(role, id)} steht jetzt auf Prestige ${level}.` : `${labelFor(role, id)} zurückgesetzt.`, 'success');
  closeEditor();
  render();
}

function initEditor() {
  // Sprungmarken: Anfang, die drei Formwechsel und das Ende.
  const jumps = [0, ...MILESTONES.map((m) => m.from).filter((n) => n > 1), MAX_PRESTIGE];
  $('#ed-quick').innerHTML = [...new Set(jumps)]
    .map((n) => `<button type="button" class="chip" data-level="${n}">${n}</button>`).join('');

  $('#ed-quick').querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => syncEditor(btn.dataset.level));
  });

  $('#ed-range').addEventListener('input', (e) => syncEditor(e.target.value));
  $('#ed-number').addEventListener('input', (e) => syncEditor(e.target.value));
  $('#ed-minus').addEventListener('click', () => syncEditor(editing.level - 1));
  $('#ed-plus').addEventListener('click', () => syncEditor(editing.level + 1));
  $('#ed-save').addEventListener('click', saveEditor);

  $('#editor').querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeEditor));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editing) closeEditor();
  });
}

// --------------------------------------------------------------------- Daten --

async function loadLevels() {
  const { data, error } = await supabase
    .from('prestige')
    .select('role, character, level');

  if (error) {
    // Ohne das Schema-Update steht die Seite trotzdem – nur eben bei null.
    const missing = /prestige|schema cache|does not exist/i.test(error.message);
    toast(missing
      ? 'Der Datenbank fehlt noch das Update aus supabase/schema.sql.'
      : `Prestige konnte nicht geladen werden: ${error.message}`, 'error');
    levels = new Map();
    render();
    return;
  }

  levels = new Map((data ?? []).map((row) => [keyOf(row.role, row.character), row.level ?? 0]));
  render();
}

// ---------------------------------------------------------------------- Init --

['#fl-role', '#fl-sort', '#fl-scope'].forEach((sel) => $(sel).addEventListener('change', renderGrid));
$('#fl-search').addEventListener('input', renderGrid);

initEditor();
renderLegend();
mountIcons();

initAuth({
  onLogin: async (user) => {
    currentUser = user;
    await loadLevels();
  },
  onLogout: () => {
    currentUser = null;
    levels = new Map();
  },
});
