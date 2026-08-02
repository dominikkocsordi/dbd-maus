import { supabase } from './supabase.js?v=52';
import { initAuth } from './auth.js?v=52';
import { initPasskeyPanel } from './passkeys.js?v=52';
import {
  avatarHtml, characterCellHtml, iconHtml, killMarksHtml, loadoutIconHtml, mountIcons, outcomeIconHtml,
  perkIconHtml,
} from './images.js?v=52';
import { perkName } from './perks.js?v=52';
import {
  clearPerks, initPerkPicker, pickedPerks, setPerkCharacter, setPerkRole, setPickedPerks,
} from './perk-picker.js?v=52';
import { GAME_MODES, KILLERS, SURVIVORS, gameModeLabel, hasPerks, labelFor, maxKills, supportsBuilds } from './data.js?v=52';
import {
  addonsForItem, cleanAddons, loadoutList, loadoutName, powerForKiller,
} from './loadout.js?v=52';
import {
  aggregate, byCharacter, escapeHtml, fmtDate, fmtDecimal, fmtNumber, fmtPercent, killTier, parseNumber, toast,
} from './utils.js?v=52';
import { createSorter } from './table-sort.js?v=52';
import { initTrackerImport, openTrackerImport } from './tracker-import-panel.js?v=52';

const RECENT_LIMIT = 5;
const BP_MAX = 2000000;
const SLIDER_MAX = 1000000;

let currentUser = null;
let matches = [];
let editingId = null;
let pendingEditId = new URLSearchParams(window.location.search).get('edit');
let streakMode = null;
let builds = [];

// ---------------------------------------------------------------- Formular --

function fillSelect(select, entries, placeholder, optional = false) {
  select.innerHTML =
    `<option value=""${optional ? '' : ' disabled'} selected>${placeholder}</option>` +
    entries.map((e) => `<option value="${e.id}">${escapeHtml(e.label)}</option>`).join('');
}

/*
  Item, Add-ons und Opfergabe hängen an der Rolle: Der Killer bringt seine Power
  mit, der Survivor ein Item. Die Power ergibt sich aus dem Killer und wird
  darum mitgesetzt, sobald einer gewählt ist; die Add-ons richten sich dann
  danach.
*/
function syncLoadoutFields(keep = true) {
  const role = currentRole();
  const item = document.getElementById('f-item');
  const offering = document.getElementById('f-offering');
  const previousItem = keep ? item.value : '';

  // Der Killer bringt seine feste Power mit – dort gibt es nichts zu wählen.
  document.getElementById('item-field').hidden = role === 'killer';

  fillSelect(item, loadoutList('item', role), 'Kein Eintrag', true);
  item.value = previousItem;
  fillSelect(offering, loadoutList('offering', role), 'Kein Eintrag', true);
  if (!keep) offering.value = '';

  syncAddonOptions(keep);
}

/*
  Jeder Killer hat genau eine Power – sie wird beim Wechsel mitgesetzt. Kennt
  der Katalog sie noch nicht, bleibt das Feld leer: Was vorher darin stand,
  gehörte zum vorigen Killer und wäre jetzt schlicht falsch.
*/
function syncPowerForKiller() {
  if (currentRole() !== 'killer') return;

  const select = document.getElementById('f-item');
  const power = powerForKiller(document.getElementById('f-killer').value) ?? '';
  if (select.value === power) return;

  select.value = power;
  syncAddonOptions(false);
  renderPowerBadge();
}

/** Zeigt die Power des Killers klein neben der Auswahl an. */
function renderPowerBadge() {
  const badge = document.getElementById('f-power');
  const id = currentRole() === 'killer' ? document.getElementById('f-item').value : '';

  badge.hidden = !id;
  badge.innerHTML = id
    ? loadoutIconHtml('item', id, loadoutName('item', id))
      + `<span class="power-badge__name">${escapeHtml(loadoutName('item', id))}</span>`
    : '';
}

function syncAddonOptions(keep = true) {
  const role = currentRole();
  const entries = addonsForItem(role, document.getElementById('f-item').value);

  // Passt ein bereits gewähltes Add-on nicht mehr zum Item, fällt es weg.
  for (const slot of [1, 2]) {
    const select = document.getElementById(`f-addon-${slot}`);
    const previous = keep ? select.value : '';
    fillSelect(select, entries, 'Kein Eintrag', true);
    select.value = entries.some((e) => e.id === previous) ? previous : '';
  }
  syncAddonHint();
}

/* Zwei gleiche Add-ons gehen nicht – das Spiel lässt sie nicht zu. */
function syncAddonHint() {
  const picked = addonValues();
  const hint = document.getElementById('f-addon-hint');
  const doubled = picked.length === 2 && picked[0] === picked[1];
  hint.textContent = doubled ? 'Zweimal dasselbe Add-on geht nicht – es wird nur einmal gezählt.' : '';
}

const addonValues = () => [1, 2]
  .map((slot) => document.getElementById(`f-addon-${slot}`).value)
  .filter(Boolean);

function currentRole() {
  return document.querySelector('input[name="role"]:checked').value;
}

/** Zeigt das Bild des gewählten Charakters neben dem Dropdown. */
function syncPortrait(field, role = field) {
  const select = document.getElementById(`f-${field}`);
  const target = document.getElementById(`f-${field}-portrait`);
  const id = select.value;

  target.innerHTML = id
    ? avatarHtml(role, id, select.options[select.selectedIndex].textContent, 'avatar--lg')
    : '';
}

/** Build-Auswahl: nur Builds der aktuellen Rolle, plus Vorschau der Perks. */
function syncBuildSelect(keep = true) {
  const select = document.getElementById('f-build');
  const previous = keep ? select.value : '';
  const role = currentRole();
  const matching = builds.filter((b) => b.role === role);

  select.innerHTML = '<option value="">Kein Build</option>'
    + matching.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
  select.value = matching.some((b) => b.id === previous) ? previous : '';
  select.disabled = matching.length === 0;

  syncBuildField();
}

/*
  In 2v8 laufen acht Survivor herum – die Kill-Auswahl geht dort bis 8K. Beim
  Wechsel in einen kleineren Modus rutscht ein zu hoher Wert auf das Maximum.
*/
function syncKillsOptions() {
  const max = maxKills(document.getElementById('f-mode').value);
  const container = document.getElementById('f-kills');
  if (container.dataset.max === String(max)) return;

  const previous = Number(container.querySelector('input:checked')?.value ?? 0);
  container.dataset.max = String(max);
  // Ein Totenkopf je Kill statt "3K"; ohne Kill bleibt der Gedankenstrich.
  container.innerHTML = Array.from({ length: max + 1 }, (_, k) => `
    <label class="segmented__opt">
      <input type="radio" name="kills" value="${k}"><span>${killMarksHtml(k)}</span>
    </label>`).join('');

  container.querySelector(`input[value="${Math.min(previous, max)}"]`).checked = true;
}

/*
  Chaos Shuffle und 2v8 geben die Perks vor – dort verschwindet die
  Build-Auswahl komplett, damit nichts Unpassendes am Match hängt.
*/
function syncBuildField() {
  const allowed = supportsBuilds(document.getElementById('f-mode').value);
  const select = document.getElementById('f-build');

  document.getElementById('build-field').hidden = !allowed;
  if (!allowed && select.value) select.value = '';
  syncBuildPreview();
}

/** Perk-Auswahl kennt den gewählten Charakter und sortiert danach vor. */
function syncPerkCharacter() {
  const role = currentRole();
  setPerkCharacter(document.getElementById(`f-${role}`).value);
}

/*
  In 2v8 gibt es keine Perks, nur Klassen – dort fällt die Auswahl weg. Chaos
  Shuffle würfelt zwar, aber was man bekommen hat, lässt sich festhalten.
*/
function syncPerkField() {
  const allowed = hasPerks(document.getElementById('f-mode').value);
  document.getElementById('perk-field').hidden = !allowed;
  if (!allowed) clearPerks();
}

function syncBuildPreview() {
  const build = builds.find((b) => b.id === document.getElementById('f-build').value);
  document.getElementById('f-build-preview').innerHTML = build
    ? (build.perks ?? []).map((f) => perkIconHtml(f, perkName(f))).join('')
    : '';
}

/** Wer einen Build wählt, hat ihn meist auch so gespielt – Plätze füllen. */
function adoptBuildPerks() {
  const build = builds.find((b) => b.id === document.getElementById('f-build').value);
  if (build) setPickedPerks(build.perks ?? []);
  syncBuildPreview();
}

function syncRoleBlocks() {
  const role = currentRole();
  document.querySelectorAll('[data-role-block]').forEach((block) => {
    const active = block.dataset.roleBlock === role;
    block.hidden = !active;
    block.querySelectorAll('select').forEach((el) => { el.disabled = !active; });
  });
  document.getElementById('entry-panel').dataset.role = role;
  setPerkRole(role);
  syncPerkCharacter();
  syncLoadoutFields(false);
  syncPowerForKiller();
  renderPowerBadge();
  syncBuildSelect(false);
}

// --- Blutpunkte-Feld: Textfeld, Slider und Chips halten sich gegenseitig aktuell
function setBloodpoints(value) {
  const bp = Math.min(Math.max(Math.round(value) || 0, 0), BP_MAX);
  const input = document.getElementById('f-bp');
  const range = document.getElementById('f-bp-range');

  input.value = fmtNumber(bp);
  range.value = Math.min(bp, SLIDER_MAX);
  input.style.setProperty('--bp-fill', `${(Math.min(bp, SLIDER_MAX) / SLIDER_MAX) * 100}%`);
  return bp;
}

function getBloodpoints() {
  return Math.min(parseNumber(document.getElementById('f-bp').value), BP_MAX);
}

function wireBloodpointsField() {
  const input = document.getElementById('f-bp');
  const range = document.getElementById('f-bp-range');

  input.addEventListener('input', () => {
    const caretAtEnd = input.selectionStart === input.value.length;
    const bp = setBloodpoints(parseNumber(input.value));
    if (caretAtEnd) input.setSelectionRange(input.value.length, input.value.length);
    return bp;
  });
  input.addEventListener('focus', () => input.select());
  range.addEventListener('input', () => setBloodpoints(Number(range.value)));

  document.querySelectorAll('[data-bp]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const raw = chip.dataset.bp;
      setBloodpoints(raw === 'reset' ? 0 : getBloodpoints() + Number(raw));
      chip.classList.add('is-pulsing');
      setTimeout(() => chip.classList.remove('is-pulsing'), 300);
    });
  });
}

/** ISO-Zeitstempel -> Wert für <input type="datetime-local"> in lokaler Zeit. */
function toLocalInput(iso) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function localNowValue() {
  return toLocalInput(new Date());
}

function buildPayload() {
  const role = currentRole();
  const playedAtRaw = document.getElementById('f-played-at').value;
  const mode = document.getElementById('f-mode').value;

  if (!mode) return { error: 'Bitte einen Gamemode wählen.' };
  if (!playedAtRaw) return { error: 'Bitte einen Zeitpunkt angeben.' };

  // Die Felder der jeweils anderen Rolle müssen leer sein – sonst greift der
  // Check-Constraint der Tabelle, etwa wenn ein Match von Killer auf Survivor
  // umgestellt wird.
  const payload = {
    user_id: currentUser.id,
    played_at: new Date(playedAtRaw).toISOString(),
    game_mode: mode,
    role,
    bloodpoints: getBloodpoints(),
    notes: document.getElementById('f-notes').value.trim() || null,
    killer: null,
    kills: null,
    survivor: null,
    escaped: null,
    faced_killer: null,
    build_id: supportsBuilds(mode) ? (document.getElementById('f-build').value || null) : null,
    perks: hasPerks(mode) && pickedPerks().length ? pickedPerks() : null,
    item: document.getElementById('f-item').value || null,
    offering: document.getElementById('f-offering').value || null,
    addons: cleanAddons(addonValues()).length ? cleanAddons(addonValues()) : null,
  };

  if (role === 'killer') {
    const killer = document.getElementById('f-killer').value;
    if (!killer) return { error: 'Bitte einen Killer wählen.' };
    payload.killer = killer;
    payload.kills = Number(document.querySelector('input[name="kills"]:checked').value);
  } else {
    const survivor = document.getElementById('f-survivor').value;
    if (!survivor) return { error: 'Bitte einen Survivor wählen.' };
    payload.survivor = survivor;
    payload.escaped = document.querySelector('input[name="escaped"]:checked').value === 'true';
    payload.faced_killer = document.getElementById('f-faced-killer').value || null;
  }

  return { payload };
}

// ---------------------------------------------------------- Bearbeitungsmodus --

function applyFormMode() {
  const editing = editingId !== null;

  document.getElementById('form-title').textContent = editing ? 'Match bearbeiten' : 'Match eintragen';
  document.getElementById('f-submit').textContent = editing ? 'Änderungen speichern' : 'Speichern';
  document.getElementById('f-cancel').hidden = !editing;
  document.getElementById('entry-panel').classList.toggle('panel--editing', editing);

  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.classList.toggle('is-editing', btn.dataset.edit === editingId);
  });
}

function resetForm() {
  editingId = null;
  document.getElementById('f-mode').value = 'public';
  document.querySelector('input[name="role"][value="killer"]').checked = true;
  document.getElementById('f-killer').value = '';
  document.getElementById('f-survivor').value = '';
  document.getElementById('f-faced-killer').value = '';
  document.getElementById('f-build').value = '';
  document.getElementById('f-item').value = '';
  document.getElementById('f-offering').value = '';
  syncLoadoutFields(false);
  syncKillsOptions();
  document.querySelector('input[name="kills"][value="0"]').checked = true;
  document.querySelector('input[name="escaped"][value="true"]').checked = true;
  document.getElementById('f-notes').value = '';
  document.getElementById('f-played-at').value = localNowValue();
  setBloodpoints(0);
  clearPerks();
  syncRoleBlocks();
  syncPortrait('killer');
  syncPortrait('survivor');
  syncPortrait('faced-killer', 'killer');
  syncBuildSelect(false);
  applyFormMode();
}

function startEdit(id) {
  const match = matches.find((m) => m.id === id);
  if (!match) return;

  editingId = id;
  document.getElementById('f-mode').value = match.game_mode;
  document.querySelector(`input[name="role"][value="${match.role}"]`).checked = true;
  syncRoleBlocks();

  if (match.role === 'killer') {
    document.getElementById('f-killer').value = match.killer ?? '';
    syncKillsOptions();
    const killsInput = document.querySelector(`input[name="kills"][value="${match.kills ?? 0}"]`);
    if (killsInput) killsInput.checked = true;
  } else {
    document.getElementById('f-survivor').value = match.survivor ?? '';
    document.querySelector(`input[name="escaped"][value="${match.escaped}"]`).checked = true;
    document.getElementById('f-faced-killer').value = match.faced_killer ?? '';
    syncPortrait('faced-killer', 'killer');
  }

  syncPortrait(match.role);
  syncPerkCharacter();
  document.getElementById('f-build').value = match.build_id ?? '';
  setPickedPerks(match.perks ?? []);
  document.getElementById('f-item').value = match.item ?? '';
  document.getElementById('f-offering').value = match.offering ?? '';
  syncAddonOptions(false);
  (match.addons ?? []).forEach((id, slot) => {
    document.getElementById(`f-addon-${slot + 1}`).value = id;
  });
  syncAddonHint();
  renderPowerBadge();
  syncBuildField();
  syncPerkField();
  document.getElementById('f-played-at').value = toLocalInput(match.played_at);
  document.getElementById('f-notes').value = match.notes ?? '';
  setBloodpoints(match.bloodpoints ?? 0);

  applyFormMode();
  document.getElementById('entry-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSubmit(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('f-submit');
  const { payload, error: validationError } = buildPayload();
  if (validationError) return toast(validationError, 'error');

  const editing = editingId;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Speichere …';

  // Beim Update bleibt der Besitzer unverändert – user_id gehört nur in den Insert.
  const { user_id: _owner, ...changes } = payload;

  const { error } = editing
    ? await supabase.from('matches').update(changes).eq('id', editing)
    : await supabase.from('matches').insert(payload);

  submitBtn.disabled = false;

  if (error) {
    applyFormMode();
    return toast(`Speichern fehlgeschlagen: ${error.message}`, 'error');
  }

  toast(editing ? 'Match aktualisiert.' : 'Match gespeichert.', 'success');
  resetForm();
  await loadMatches();
}

// ------------------------------------------------------------------ Render --

function renderKpis() {
  const s = aggregate(matches);

  document.getElementById('kpi-total').textContent = fmtNumber(s.total);
  document.getElementById('kpi-split').textContent =
    `${fmtNumber(s.killerMatches)} als Killer · ${fmtNumber(s.survivorMatches)} als Survivor`;

  document.getElementById('kpi-killrate').textContent = fmtPercent(s.killRate);
  document.getElementById('kpi-kills').textContent =
    `${fmtNumber(s.kills)} Kills · Ø ${fmtDecimal(s.killsAvg)} pro Match · ${fmtNumber(s.merciless)}× alle Kills`;

  document.getElementById('kpi-escaperate').textContent = fmtPercent(s.escapeRate);
  document.getElementById('kpi-escapes').textContent =
    `${fmtNumber(s.escapes)} ${s.escapes === 1 ? 'Escape' : 'Escapes'} bei ${fmtNumber(s.survivorMatches)} ${s.survivorMatches === 1 ? 'Trial' : 'Trials'}`;

  document.getElementById('kpi-bp').textContent = fmtNumber(s.bloodpoints);
  document.getElementById('kpi-bp-avg').textContent =
    s.bloodpointsAvg === null ? 'noch keine Daten' : `Ø ${fmtNumber(s.bloodpointsAvg)} pro Match`;

  document.getElementById('last-played').textContent = s.total
    ? `zuletzt ${fmtDate(matches[0].played_at)}`
    : '';
}

/* Sortierung der kleinen Liste – sie umfasst immer nur die jüngsten Matches. */
const RECENT_VALUES = {
  date: (m) => new Date(m.played_at ?? 0).getTime(),
  character: (m) => labelFor(m.role, m.killer ?? m.survivor),
  // Ein gemeinsames Maß für beide Rollen: Anteil des Erfolgs am Möglichen.
  result: (m) => (m.role === 'killer' ? (m.kills ?? 0) / maxKills(m.game_mode) : Number(Boolean(m.escaped))),
  bp: (m) => m.bloodpoints,
};

const recentSorter = createSorter({
  table: '#recent-table',
  values: RECENT_VALUES,
  initial: 'date',
  onChange: () => renderRecent(),
});

function renderRecent() {
  const body = document.getElementById('recent-body');

  if (!matches.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Noch nichts eingetragen.</td></tr>';
    return;
  }

  body.innerHTML = recentSorter.apply(matches.slice(0, RECENT_LIMIT)).map((m) => {
    const result = m.role === 'killer'
      ? `<span class="pill pill--k${killTier(m.kills, m.game_mode)}">${m.kills}K</span>`
      : outcomeIconHtml(m.escaped);
    const character = m.killer ?? m.survivor;
    const buildName = builds.find((b) => b.id === m.build_id)?.name;
    const sub = [
      gameModeLabel(m.game_mode),
      m.faced_killer ? `vs ${labelFor('killer', m.faced_killer)}` : null,
      buildName,
      m.item ? loadoutName('item', m.item) : null,
    ].filter(Boolean).join(' · ');

    return `
      <tr class="is-${m.role}">
        <td data-label="Datum">${fmtDate(m.played_at)}</td>
        <td data-label="Charakter">${characterCellHtml(m.role, character, labelFor(m.role, character), sub)}</td>
        <td data-label="Ergebnis">${result}</td>
        <td data-label="BP" class="num">${fmtNumber(m.bloodpoints)}</td>
        <td data-label="Aktion" class="num">
          <span class="row-actions">
            <button type="button" class="icon-btn" data-edit="${m.id}" title="Bearbeiten" aria-label="Match bearbeiten">&#9998;</button>
            <button type="button" class="icon-btn icon-btn--danger" data-delete="${m.id}" title="Löschen" aria-label="Match löschen">&#10005;</button>
          </span>
        </td>
      </tr>`;
  }).join('');

  body.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteMatch(btn.dataset.delete));
  });
  body.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(btn.dataset.edit));
  });

  applyFormMode();
}

function renderBars(container, rows) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  container.innerHTML = rows.map((r) => `
    <div class="bar">
      <span class="bar__label">${r.icon ? iconHtml(r.icon) : ''}${escapeHtml(r.label)}</span>
      <span class="bar__track"><span class="bar__fill ${r.modifier ?? ''}" style="width:${(r.value / max) * 100}%"></span></span>
      <span class="bar__value">${fmtNumber(r.value)}</span>
    </div>`).join('');
}

function renderDistributions() {
  const killer = matches.filter((m) => m.role === 'killer');
  const survivor = matches.filter((m) => m.role === 'survivor');

  const topKills = killer.reduce((max, m) => Math.max(max, maxKills(m.game_mode)), 4);

  renderBars(
    document.getElementById('dist-kills'),
    Array.from({ length: topKills + 1 }, (_, k) => ({
      label: `${k}K`,
      value: killer.filter((m) => m.kills === k).length,
      modifier: `bar__fill--k${Math.round((k / topKills) * 4)}`,
    })),
  );

  renderBars(document.getElementById('dist-escape'), [
    { label: 'Entkommen', icon: 'escape', value: survivor.filter((m) => m.escaped).length, modifier: 'bar__fill--good' },
    { label: 'Gestorben', icon: 'sacrificed', value: survivor.filter((m) => !m.escaped).length, modifier: 'bar__fill--bad' },
  ]);
}

/** Serien laufen pro Gamemode – die Tabs zeigen nur Modi mit Matches. */
function renderStreakTabs() {
  const container = document.getElementById('streak-modes');
  const counts = new Map();
  for (const m of matches) counts.set(m.game_mode, (counts.get(m.game_mode) ?? 0) + 1);

  const modes = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!modes.some(([mode]) => mode === streakMode)) streakMode = modes[0]?.[0] ?? null;

  container.innerHTML = modes.map(([mode, count]) => `
    <button type="button" role="tab" class="tab${mode === streakMode ? ' is-active' : ''}"
            data-streak-mode="${escapeHtml(mode)}" aria-selected="${mode === streakMode}">
      ${escapeHtml(gameModeLabel(mode))}<span class="tab__count">${fmtNumber(count)}</span>
    </button>`).join('');

  container.querySelectorAll('[data-streak-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      streakMode = btn.dataset.streakMode;
      renderStreaks();
    });
  });
}

function renderStreaks() {
  renderStreakTabs();
  const scoped = matches.filter((m) => m.game_mode === streakMode);

  for (const role of ['killer', 'survivor']) {
    const container = document.getElementById(`streak-${role}`);
    // Nur laufende Serien: wer sie reisst, verschwindet aus der Liste.
    const rows = byCharacter(scoped, role)
      .filter((entry) => entry.streak.current > 0)
      .sort((a, b) => b.streak.current - a.streak.current || b.streak.best - a.streak.best)
      .slice(0, 8);

    if (!rows.length) {
      container.innerHTML = '<p class="empty">Keine laufende Serie</p>';
      continue;
    }

    container.innerHTML = rows.map(({ id, streak }) => `
      <article class="streak-card streak-card--hot">
        ${avatarHtml(role, id, labelFor(role, id), 'avatar--xl')}
        <div class="streak-card__body">
          <span class="streak-card__name">${escapeHtml(labelFor(role, id))}</span>
          <span class="streak-card__meta">Beste ${fmtNumber(streak.best)}</span>
        </div>
        <span class="streak-card__value">&#128293;${fmtNumber(streak.current)}</span>
      </article>`).join('');
  }
}

// -------------------------------------------------------------------- Daten --

async function deleteMatch(id) {
  if (!window.confirm('Dieses Match wirklich löschen?')) return;
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) return toast(`Löschen fehlgeschlagen: ${error.message}`, 'error');

  toast('Match gelöscht.');
  if (editingId === id) resetForm();
  await loadMatches();
}

async function loadBuilds() {
  const { data, error } = await supabase
    .from('builds')
    .select('id, name, role, character, perks')
    .order('created_at', { ascending: false });

  if (error) {
    toast(`Builds konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  builds = data ?? [];
  syncBuildSelect();
}

async function loadMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('id, played_at, role, game_mode, killer, kills, survivor, escaped, faced_killer, build_id, perks, item, offering, addons, bloodpoints, notes')
    .order('played_at', { ascending: false })
    .limit(2000);

  if (error) {
    toast(`Daten konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  matches = data ?? [];
  renderKpis();
  renderRecent();
  renderDistributions();
  renderStreaks();

  // Aus der Detail-Statistik verlinkt: index.html?edit=<id>
  if (pendingEditId) {
    const id = pendingEditId;
    pendingEditId = null;
    window.history.replaceState({}, '', window.location.pathname);
    startEdit(id);
  }
}

// --------------------------------------------------------------------- Init --

function initForm() {
  fillSelect(document.getElementById('f-mode'), GAME_MODES, 'Gamemode wählen …');
  fillSelect(document.getElementById('f-killer'), KILLERS, 'Killer wählen …');
  fillSelect(document.getElementById('f-survivor'), SURVIVORS, 'Survivor wählen …');
  fillSelect(document.getElementById('f-faced-killer'), KILLERS, 'Kein Eintrag', true);

  document.getElementById('f-mode').value = 'public';
  document.getElementById('f-played-at').value = localNowValue();
  syncKillsOptions();

  document.querySelectorAll('input[name="role"]').forEach((radio) => {
    radio.addEventListener('change', syncRoleBlocks);
  });
  syncRoleBlocks();

  wireBloodpointsField();
  setBloodpoints(0);

  for (const [field, role] of [['killer', 'killer'], ['survivor', 'survivor'], ['faced-killer', 'killer']]) {
    document.getElementById(`f-${field}`).addEventListener('change', () => {
      syncPortrait(field, role);
      if (field === 'faced-killer') return;
      syncPerkCharacter();
      if (field === 'killer') syncPowerForKiller();
    });
    syncPortrait(field, role);
  }

  document.getElementById('f-mode').addEventListener('change', () => {
    syncBuildField();
    syncPerkField();
    syncKillsOptions();
  });
  document.getElementById('match-form').addEventListener('submit', handleSubmit);
  document.getElementById('f-cancel').addEventListener('click', resetForm);
  document.getElementById('f-build').addEventListener('change', adoptBuildPerks);
  document.getElementById('import-open').addEventListener('click', openTrackerImport);
  document.getElementById('f-item').addEventListener('change', () => syncAddonOptions());
  for (const slot of [1, 2]) {
    document.getElementById(`f-addon-${slot}`).addEventListener('change', syncAddonHint);
  }
  syncLoadoutFields(false);
  initPerkPicker();
  syncPerkField();
  applyFormMode();
}

initForm();
mountIcons();
initAuth({
  onLogin: (user) => {
    currentUser = user;
    loadBuilds().then(loadMatches);
    initPasskeyPanel();
    // Nach dem Import die Übersicht neu laden, damit die Runden sofort zählen.
    initTrackerImport(user, loadMatches);
  },
  onLogout: () => {
    currentUser = null;
    matches = [];
  },
});
