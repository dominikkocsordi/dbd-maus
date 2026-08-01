/*
  Schnelleintrag – die Maske für direkt nach der Runde.

  Zwei Dinge unterscheiden sie vom Formular auf der Übersicht:

    · Sie merkt sich Rolle, Modus, Charakter und Perks. Nach dem Speichern
      bleibt alles stehen, nur Kills, Blutpunkte und Notiz gehen auf null –
      die nächste Runde ist damit meist zwei Klicks weit weg.
    · Geht gerade nichts raus, wandert der Eintrag in eine Warteschlange im
      Browser und wird später von selbst nachgereicht. Nichts geht verloren,
      auch wenn das Fenster zwischendurch zu ist.
*/
import { supabase } from './supabase.js?v=40';
import { initAuth } from './auth.js?v=40';
import { GAME_MODES, KILLERS, SURVIVORS, gameModeLabel, hasPerks, labelFor, maxKills } from './data.js?v=40';
import { avatarHtml, killMarksHtml, mountIcons } from './images.js?v=40';
import { clearPerks, initPerkPicker, pickedPerks, setPerkCharacter, setPerkRole, setPickedPerks } from './perk-picker.js?v=40';
import { escapeHtml, fmtNumber, parseNumber, toast } from './utils.js?v=40';

const BP_MAX = 2000000;
const QUEUE_KEY = 'dbd.quick.queue';     // noch nicht abgeschickte Einträge
const PREFS_KEY = 'dbd.quick.prefs';     // was beim nächsten Start vorbelegt wird
const RECENT_LIMIT = 3;

let currentUser = null;
let recent = [];

const $ = (sel) => document.querySelector(sel);
const currentRole = () => document.querySelector('input[name="role"]:checked').value;

// ------------------------------------------------------------ Warteschlange --

/*
  Alles, was den Browser nicht verlassen hat, liegt hier. Kaputte Inhalte
  werfen wir weg, statt die Seite daran scheitern zu lassen.
*/
function readStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Kein Speicher verfügbar (privates Fenster o. Ä.) – dann eben nicht.
  }
}

const queue = () => readStore(QUEUE_KEY, []).filter((e) => e && e.payload);
const setQueue = (list) => writeStore(QUEUE_KEY, list);

function renderQueueStatus(busy = false) {
  const pending = queue().length;
  const box = $('#queue-status');

  box.hidden = pending === 0 && !busy;
  if (box.hidden) return;

  // Kurz halten – die Kopfzeile ist schmal; das Ganze steht im Titel.
  box.className = `quick-status${pending ? ' quick-status--waiting' : ''}`;
  box.textContent = busy ? 'sendet …' : `${fmtNumber(pending)} wartet`;
  box.title = busy
    ? 'Warteschlange wird übertragen'
    : `${fmtNumber(pending)} ${pending === 1 ? 'Eintrag wartet' : 'Einträge warten'} auf eine Verbindung`;
}

/**
 * Schickt die Warteschlange ab, älteste zuerst. Bricht beim ersten Fehler ab,
 * damit die Reihenfolge stimmt und wir nicht in eine Schleife laufen.
 */
async function flushQueue() {
  const pending = queue();
  if (!pending.length || !currentUser) return;

  renderQueueStatus(true);
  const left = [...pending];

  while (left.length) {
    const entry = left[0];
    const { error } = await supabase.from('matches').insert({ ...entry.payload, user_id: currentUser.id });

    if (error) {
      setQueue(left);
      renderQueueStatus();
      return;
    }

    left.shift();
    setQueue(left);
    addRecent(entry.payload, true);
  }

  renderQueueStatus();
  toast(`${fmtNumber(pending.length)} nachgetragen.`, 'success');
}

// ----------------------------------------------------------------- Formular --

function fillSelect(select, entries, placeholder) {
  select.innerHTML = `<option value="" disabled>${escapeHtml(placeholder)}</option>`
    + entries.map((e) => `<option value="${e.id}">${escapeHtml(e.label)}</option>`).join('');
}

function syncPortrait() {
  const role = currentRole();
  const select = $('#q-character');
  $('#q-portrait').innerHTML = select.value
    ? avatarHtml(role, select.value, labelFor(role, select.value), 'avatar--lg')
    : '';
}

/** In 2v8 laufen acht Survivor herum – dort geht die Auswahl bis 8K. */
function syncKills() {
  const max = maxKills($('#q-mode').value);
  const box = $('#q-kills');
  if (box.dataset.max === String(max)) return;

  const previous = Number(box.querySelector('input:checked')?.value ?? 0);
  box.dataset.max = String(max);
  box.innerHTML = Array.from({ length: max + 1 }, (_, k) => `
    <label class="segmented__opt">
      <input type="radio" name="kills" value="${k}"><span>${killMarksHtml(k)}</span>
    </label>`).join('');

  box.querySelector(`input[value="${Math.min(previous, max)}"]`).checked = true;
}

/** In 2v8 gibt es keine Perks, nur Klassen. */
function syncPerkField() {
  const allowed = hasPerks($('#q-mode').value);
  $('#perk-field').hidden = !allowed;
  if (!allowed) clearPerks();
}

function syncRole() {
  const role = currentRole();
  const previous = $('#q-character').value;

  document.querySelectorAll('[data-role-block]').forEach((block) => {
    block.hidden = block.dataset.roleBlock !== role;
  });

  $('#q-character-label').textContent = role === 'killer' ? 'Killer' : 'Survivor';
  fillSelect($('#q-character'), role === 'killer' ? KILLERS : SURVIVORS, 'Bitte wählen');
  $('#q-character').value = [...$('#q-character').options].some((o) => o.value === previous) ? previous : '';

  setPerkRole(role);
  setPerkCharacter($('#q-character').value);
  syncPortrait();
}

function setBloodpoints(value) {
  const bp = Math.min(Math.max(Math.round(value) || 0, 0), BP_MAX);
  $('#q-bp').value = bp ? fmtNumber(bp) : '';
  return bp;
}

const getBloodpoints = () => Math.min(parseNumber($('#q-bp').value), BP_MAX);

// -------------------------------------------------------------- Vorbelegung --

/** Was beim nächsten Start wieder dastehen soll. */
function savePrefs() {
  writeStore(PREFS_KEY, {
    role: currentRole(),
    mode: $('#q-mode').value,
    character: $('#q-character').value,
    perks: pickedPerks(),
  });
}

function applyPrefs() {
  const prefs = readStore(PREFS_KEY, null);
  if (!prefs) return;

  const roleInput = document.querySelector(`input[name="role"][value="${prefs.role}"]`);
  if (roleInput) roleInput.checked = true;

  syncRole();
  if (GAME_MODES.some((m) => m.id === prefs.mode)) $('#q-mode').value = prefs.mode;
  syncKills();
  syncPerkField();

  const list = currentRole() === 'killer' ? KILLERS : SURVIVORS;
  if (list.some((c) => c.id === prefs.character)) {
    $('#q-character').value = prefs.character;
    setPerkCharacter(prefs.character);
    syncPortrait();
  }

  // Die Perks der letzten Runde stehen wieder da – meist spielt man sie erneut.
  if (Array.isArray(prefs.perks) && prefs.perks.length) setPickedPerks(prefs.perks);
}

// ------------------------------------------------------------------ Absenden --

function buildPayload() {
  const role = currentRole();
  const mode = $('#q-mode').value;
  const character = $('#q-character').value;

  if (!mode) return { error: 'Bitte einen Gamemode wählen.' };
  if (!character) return { error: role === 'killer' ? 'Bitte einen Killer wählen.' : 'Bitte einen Survivor wählen.' };

  // Die Felder der anderen Rolle müssen leer bleiben, sonst greift der
  // Check-Constraint der Tabelle.
  const payload = {
    played_at: new Date().toISOString(),
    game_mode: mode,
    role,
    bloodpoints: getBloodpoints(),
    notes: $('#q-notes').value.trim() || null,
    killer: null,
    kills: null,
    survivor: null,
    escaped: null,
    faced_killer: null,
    build_id: null,
    perks: hasPerks(mode) && pickedPerks().length ? pickedPerks() : null,
  };

  if (role === 'killer') {
    payload.killer = character;
    payload.kills = Number(document.querySelector('input[name="kills"]:checked').value);
  } else {
    payload.survivor = character;
    payload.escaped = document.querySelector('input[name="escaped"]:checked').value === 'true';
    payload.faced_killer = $('#q-faced-killer').value || null;
  }

  return { payload };
}

/** Nach dem Speichern bleibt die Aufstellung stehen, das Ergebnis geht auf null. */
function resetResult() {
  const kills = $('#q-kills').querySelector('input[value="0"]');
  if (kills) kills.checked = true;
  document.querySelector('input[name="escaped"][value="true"]').checked = true;
  setBloodpoints(0);
  $('#q-notes').value = '';
}

function addRecent(payload, fromQueue = false) {
  const role = payload.role;
  const label = labelFor(role, payload.killer ?? payload.survivor);
  const result = role === 'killer' ? `${payload.kills}K` : (payload.escaped ? 'Entkommen' : 'Gestorben');

  recent = [{
    text: `${label} · ${result} · ${fmtNumber(payload.bloodpoints)} BP`,
    mode: gameModeLabel(payload.game_mode),
    queued: fromQueue,
  }, ...recent].slice(0, RECENT_LIMIT);

  $('#q-recent').hidden = false;
  $('#q-recent-list').innerHTML = recent.map((r) => `
    <li>
      <span class="quick-recent__text">${escapeHtml(r.text)}</span>
      <span class="quick-recent__mode">${escapeHtml(r.mode)}${r.queued ? ' · nachgetragen' : ''}</span>
    </li>`).join('');
}

async function submit(event) {
  event.preventDefault();

  const hint = $('#q-hint');
  const { payload, error: invalid } = buildPayload();

  if (invalid) {
    hint.textContent = invalid;
    hint.className = 'form-hint form-hint--error';
    return;
  }

  const button = $('#q-save');
  button.disabled = true;
  savePrefs();

  const { error } = await supabase.from('matches').insert({ ...payload, user_id: currentUser.id });
  button.disabled = false;

  if (error) {
    // Nichts verwerfen: der Eintrag wandert in die Warteschlange und geht
    // raus, sobald die Verbindung wieder steht.
    setQueue([...queue(), { payload, saved_at: new Date().toISOString() }]);
    renderQueueStatus();
    hint.textContent = 'Kein Netz – der Eintrag wartet und geht später von selbst raus.';
    hint.className = 'form-hint';
    addRecent(payload);
    resetResult();
    return;
  }

  hint.textContent = 'Gespeichert.';
  hint.className = 'form-hint form-hint--success';
  addRecent(payload);
  resetResult();
  $('#q-character').focus();
}

// --------------------------------------------------------------------- Init --

function initForm() {
  $('#q-mode').innerHTML = GAME_MODES
    .map((m) => `<option value="${m.id}">${escapeHtml(m.label)}</option>`).join('');
  fillSelect($('#q-faced-killer'), KILLERS, 'Unbekannt');
  $('#q-faced-killer').insertAdjacentHTML('afterbegin', '<option value="" selected>Unbekannt</option>');

  syncRole();
  syncKills();
  syncPerkField();
  initPerkPicker(savePrefs);

  document.querySelectorAll('input[name="role"]').forEach((el) => {
    el.addEventListener('change', () => { syncRole(); savePrefs(); });
  });

  $('#q-mode').addEventListener('change', () => { syncKills(); syncPerkField(); savePrefs(); });
  $('#q-character').addEventListener('change', () => {
    setPerkCharacter($('#q-character').value);
    syncPortrait();
    savePrefs();
  });

  $('#q-bp').addEventListener('input', () => setBloodpoints(parseNumber($('#q-bp').value)));
  $('#q-bp').addEventListener('focus', () => $('#q-bp').select());

  document.querySelectorAll('[data-bp]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const raw = chip.dataset.bp;
      setBloodpoints(raw === 'reset' ? 0 : getBloodpoints() + Number(raw));
    });
  });

  $('#q-perks-clear').addEventListener('click', () => { clearPerks(); savePrefs(); });
  $('#quick-form').addEventListener('submit', submit);
}

initForm();
mountIcons();
renderQueueStatus();

// Sobald wieder Netz da ist, geht die Warteschlange von selbst raus.
window.addEventListener('online', () => flushQueue());

initAuth({
  onLogin: async (user) => {
    currentUser = user;
    applyPrefs();
    await flushQueue();
  },
  onLogout: () => { currentUser = null; },
});
