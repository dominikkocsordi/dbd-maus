import { supabase } from './supabase.js';
import { initAuth } from './auth.js';
import { initPasskeyPanel } from './passkeys.js';
import { avatarHtml, characterCellHtml } from './images.js';
import { GAME_MODES, KILLERS, SURVIVORS, gameModeLabel, labelFor } from './data.js';
import {
  aggregate, byCharacter, escapeHtml, fmtDate, fmtDecimal, fmtNumber, fmtPercent, parseNumber, toast,
} from './utils.js';

const BP_MAX = 2000000;
const SLIDER_MAX = 1000000;

let currentUser = null;
let matches = [];
let editingId = null;
let pendingEditId = new URLSearchParams(window.location.search).get('edit');

// ---------------------------------------------------------------- Formular --

function fillSelect(select, entries, placeholder) {
  select.innerHTML =
    `<option value="" disabled selected>${placeholder}</option>` +
    entries.map((e) => `<option value="${e.id}">${escapeHtml(e.label)}</option>`).join('');
}

function currentRole() {
  return document.querySelector('input[name="role"]:checked').value;
}

/** Zeigt das Bild des gewählten Charakters neben dem Dropdown. */
function syncPortrait(role) {
  const select = document.getElementById(`f-${role}`);
  const target = document.getElementById(`f-${role}-portrait`);
  const id = select.value;

  target.innerHTML = id
    ? avatarHtml(role, id, select.options[select.selectedIndex].textContent, 'avatar--lg')
    : '';
}

function syncRoleBlocks() {
  const role = currentRole();
  document.querySelectorAll('[data-role-block]').forEach((block) => {
    const active = block.dataset.roleBlock === role;
    block.hidden = !active;
    block.querySelectorAll('select').forEach((el) => { el.disabled = !active; });
  });
  document.getElementById('entry-panel').dataset.role = role;
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
  }

  return { payload };
}

// ---------------------------------------------------------- Bearbeitungsmodus --

function applyFormMode() {
  const editing = editingId !== null;

  document.getElementById('form-title').textContent = editing ? 'Match bearbeiten' : 'Match eintragen';
  document.getElementById('form-sub').textContent = editing
    ? 'Änderungen werden für den ausgewählten Eintrag gespeichert.'
    : 'Ein Formular, beide Rollen – die Felder passen sich an.';
  document.getElementById('f-submit').textContent = editing ? 'Änderungen speichern' : 'Match speichern';
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
  document.querySelector('input[name="kills"][value="0"]').checked = true;
  document.querySelector('input[name="escaped"][value="true"]').checked = true;
  document.getElementById('f-notes').value = '';
  document.getElementById('f-played-at').value = localNowValue();
  setBloodpoints(0);
  syncRoleBlocks();
  syncPortrait('killer');
  syncPortrait('survivor');
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
    document.querySelector(`input[name="kills"][value="${match.kills ?? 0}"]`).checked = true;
  } else {
    document.getElementById('f-survivor').value = match.survivor ?? '';
    document.querySelector(`input[name="escaped"][value="${match.escaped}"]`).checked = true;
  }

  syncPortrait(match.role);
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
    `${fmtNumber(s.kills)} Kills · Ø ${fmtDecimal(s.killsAvg)} pro Match · ${fmtNumber(s.merciless)}× 4K`;

  document.getElementById('kpi-escaperate').textContent = fmtPercent(s.escapeRate);
  document.getElementById('kpi-escapes').textContent =
    `${fmtNumber(s.escapes)} ${s.escapes === 1 ? 'Escape' : 'Escapes'} bei ${fmtNumber(s.survivorMatches)} Trials`;

  document.getElementById('kpi-bp').textContent = fmtNumber(s.bloodpoints);
  document.getElementById('kpi-bp-avg').textContent =
    s.bloodpointsAvg === null ? 'noch keine Daten' : `Ø ${fmtNumber(s.bloodpointsAvg)} pro Match`;

  document.getElementById('hero-sub').textContent = s.total
    ? `${fmtNumber(s.total)} Matches erfasst – zuletzt am ${fmtDate(matches[0].played_at)}.`
    : 'Noch keine Matches erfasst. Trag dein erstes Trial unten ein.';
}

function renderRecent() {
  const body = document.getElementById('recent-body');

  if (!matches.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">Noch nichts eingetragen.</td></tr>';
    return;
  }

  body.innerHTML = matches.slice(0, 15).map((m) => {
    const result = m.role === 'killer'
      ? `<span class="pill pill--k${m.kills}">${m.kills}K</span>`
      : `<span class="pill ${m.escaped ? 'pill--good' : 'pill--bad'}">${m.escaped ? 'Entkommen' : 'Gestorben'}</span>`;

    return `
      <tr>
        <td data-label="Datum">${fmtDate(m.played_at)}<span class="td-sub">${escapeHtml(gameModeLabel(m.game_mode))}</span></td>
        <td data-label="Rolle"><span class="role-tag role-tag--${m.role}">${m.role === 'killer' ? 'Killer' : 'Survivor'}</span></td>
        <td data-label="Charakter">${characterCellHtml(m.role, m.killer ?? m.survivor, labelFor(m.role, m.killer ?? m.survivor))}</td>
        <td data-label="Ergebnis">${result}</td>
        <td data-label="BP" class="num">${fmtNumber(m.bloodpoints)}</td>
        <td data-label="Aktion" class="num row-actions">
          <button type="button" class="icon-btn" data-edit="${m.id}" title="Bearbeiten" aria-label="Match bearbeiten">&#9998;</button>
          <button type="button" class="icon-btn icon-btn--danger" data-delete="${m.id}" title="Löschen" aria-label="Match löschen">&#10005;</button>
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
      <span class="bar__label">${escapeHtml(r.label)}</span>
      <span class="bar__track"><span class="bar__fill ${r.modifier ?? ''}" style="width:${(r.value / max) * 100}%"></span></span>
      <span class="bar__value">${fmtNumber(r.value)}</span>
    </div>`).join('');
}

function renderDistributions() {
  const killer = matches.filter((m) => m.role === 'killer');
  const survivor = matches.filter((m) => m.role === 'survivor');

  renderBars(
    document.getElementById('dist-kills'),
    [0, 1, 2, 3, 4].map((k) => ({
      label: `${k}K`,
      value: killer.filter((m) => m.kills === k).length,
      modifier: `bar__fill--k${k}`,
    })),
  );

  renderBars(document.getElementById('dist-escape'), [
    { label: 'Entkommen', value: survivor.filter((m) => m.escaped).length, modifier: 'bar__fill--good' },
    { label: 'Gestorben', value: survivor.filter((m) => !m.escaped).length, modifier: 'bar__fill--bad' },
  ]);
}

function renderStreaks() {
  for (const role of ['killer', 'survivor']) {
    const container = document.getElementById(`streak-${role}`);
    const rows = byCharacter(matches, role)
      .filter((entry) => entry.streak.best > 0)
      .sort((a, b) => b.streak.current - a.streak.current || b.streak.best - a.streak.best)
      .slice(0, 6);

    if (!rows.length) {
      container.innerHTML = '<p class="empty">Noch keine Serie – der erste Erfolg startet sie.</p>';
      continue;
    }

    container.innerHTML = rows.map(({ id, streak }) => `
      <div class="streak${streak.current > 0 ? ' streak--hot' : ''}">
        ${avatarHtml(role, id, labelFor(role, id))}
        <span class="streak__name">${escapeHtml(labelFor(role, id))}</span>
        <span class="streak__current" title="Laufende Serie">
          ${streak.current > 0 ? `&#128293; ${fmtNumber(streak.current)}` : '&#128128; 0'}
        </span>
        <span class="streak__best" title="Längste Serie">Beste ${fmtNumber(streak.best)}</span>
      </div>`).join('');
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

  document.getElementById('f-mode').value = 'public';
  document.getElementById('f-played-at').value = localNowValue();

  document.querySelectorAll('input[name="role"]').forEach((radio) => {
    radio.addEventListener('change', syncRoleBlocks);
  });
  syncRoleBlocks();

  wireBloodpointsField();
  setBloodpoints(0);

  for (const role of ['killer', 'survivor']) {
    document.getElementById(`f-${role}`).addEventListener('change', () => syncPortrait(role));
    syncPortrait(role);
  }

  document.getElementById('match-form').addEventListener('submit', handleSubmit);
  document.getElementById('f-cancel').addEventListener('click', resetForm);
  applyFormMode();
}

initForm();
initAuth({
  onLogin: (user) => {
    currentUser = user;
    loadMatches();
    initPasskeyPanel();
  },
  onLogout: () => {
    currentUser = null;
    matches = [];
  },
});
