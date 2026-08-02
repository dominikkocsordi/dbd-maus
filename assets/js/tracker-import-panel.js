// Import aus dem offiziellen Tracker: Der Knopf am Eintragsformular öffnet ein
// Fenster, in das die Daten eingefügt werden. Von dort aus geprüft, in der
// Vorschau bestätigt und als Matches gespeichert.

import { supabase } from './supabase.js?v=50';
import {
  avatarHtml, killMarksHtml, loadoutIconHtml, outcomeIconHtml, perkIconHtml,
} from './images.js?v=50';
import { loadoutName } from './loadout.js?v=50';
import { perkName } from './perks.js?v=50';
import { gameModeLabel, labelFor } from './data.js?v=50';
import { escapeHtml, fmtDate, fmtNumber, toast } from './utils.js?v=50';
import { attachBuilds, markDuplicates, parseMatchHistory } from './tracker-import.js?v=50';

let currentUser = null;
let onImported = null;
let rows = [];

const el = (id) => document.getElementById(id);

function hint(message, type = 'info') {
  const box = el('import-hint');
  box.textContent = message ?? '';
  box.className = `form-hint form-hint--${type}`;
}

// ------------------------------------------------------------ Lesezeichen --

/*
  Das Bookmarklet steht als normale Datei im Repo – hier wird daraus die
  javascript:-Adresse gebaut. So bleibt der Quelltext lesbar und muss nicht
  doppelt gepflegt werden.
*/
async function mountBookmarklet() {
  const link = el('import-bookmarklet');

  try {
    const res = await fetch('assets/js/tracker-bookmarklet.js?v=50');
    if (!res.ok) throw new Error(String(res.status));
    link.href = `javascript:${encodeURIComponent(await res.text())}`;
    link.removeAttribute('aria-disabled');
  } catch {
    link.remove();
    el('import-bookmarklet-step')?.remove();
  }
}

// -------------------------------------------------------------- Vorschau --

function rowHtml(row, index) {
  const { payload } = row;
  const character = payload.killer ?? payload.survivor;
  const result = payload.role === 'killer'
    ? killMarksHtml(payload.kills)
    : outcomeIconHtml(payload.escaped);

  const notes = [
    gameModeLabel(payload.game_mode),
    payload.faced_killer ? `vs ${labelFor('killer', payload.faced_killer)}` : null,
    row.buildName,
    row.source.rawMode && payload.game_mode === 'event' ? row.source.rawMode : null,
  ].filter(Boolean).join(' · ');

  const flags = row.duplicate
    ? '<span class="pill">schon vorhanden</span>'
    : row.warnings.map((w) => `<span class="pill pill--bad">${escapeHtml(w)}</span>`).join(' ');

  return `
    <tr class="is-${payload.role}${row.duplicate ? ' is-muted' : ''}">
      <td>
        <input type="checkbox" data-import-row="${index}" ${row.duplicate ? '' : 'checked'}>
      </td>
      <td data-label="Datum">${fmtDate(payload.played_at)}</td>
      <td data-label="Charakter">
        <span class="char-cell">
          ${avatarHtml(payload.role, character, labelFor(payload.role, character))}
          <span class="char-cell__text">
            <span class="char-cell__name">${escapeHtml(labelFor(payload.role, character))}</span>
            <span class="char-cell__sub">${escapeHtml(notes)}</span>
          </span>
        </span>
      </td>
      <td data-label="Ergebnis">${result}</td>
      <td data-label="Perks">${(payload.perks ?? []).map((f) => perkIconHtml(f, perkName(f))).join('')}</td>
      <td data-label="Ausrüstung">${[
        payload.item ? loadoutIconHtml('item', payload.item, loadoutName('item', payload.item)) : '',
        ...(payload.addons ?? []).map((id) => loadoutIconHtml('addon', id, loadoutName('addon', id))),
        payload.offering ? loadoutIconHtml('offering', payload.offering, loadoutName('offering', payload.offering)) : '',
      ].filter(Boolean).join('')}</td>
      <td data-label="BP" class="num">${fmtNumber(payload.bloodpoints)}</td>
      <td data-label="Hinweis">${flags}</td>
    </tr>`;
}

function selectedCount() {
  return document.querySelectorAll('[data-import-row]:checked').length;
}

function syncSaveButton() {
  const count = selectedCount();
  const button = el('import-save');
  button.hidden = !rows.length;
  button.disabled = count === 0;
  button.textContent = count === 1 ? '1 Match übernehmen' : `${count} Matches übernehmen`;
}

function renderPreview() {
  const target = el('import-preview');

  if (!rows.length) {
    target.innerHTML = '';
    syncSaveButton();
    return;
  }

  target.innerHTML = `
    <div class="table-wrap">
      <table class="table import-table">
        <thead>
          <tr>
            <th><input type="checkbox" id="import-all" checked></th>
            <th>Datum</th><th>Charakter</th><th>Ergebnis</th>
            <th>Perks</th><th>Ausrüstung</th><th class="num">BP</th><th>Hinweis</th>
          </tr>
        </thead>
        <tbody>${rows.map(rowHtml).join('')}</tbody>
      </table>
    </div>`;

  const all = el('import-all');
  all.checked = selectedCount() === rows.length;
  all.addEventListener('change', () => {
    document.querySelectorAll('[data-import-row]').forEach((box) => { box.checked = all.checked; });
    syncSaveButton();
  });

  target.querySelectorAll('[data-import-row]').forEach((box) => {
    box.addEventListener('change', () => {
      all.checked = selectedCount() === rows.length;
      syncSaveButton();
    });
  });

  syncSaveButton();
}

// ---------------------------------------------------------------- Ablauf --

/*
  Dubletten erkennt der Abgleich nur gegen bereits gespeicherte Matches im
  Zeitraum des Imports – mehr muss dafür nicht geladen werden.
*/
async function loadExisting(fromIso, toIso) {
  const { data, error } = await supabase
    .from('matches')
    .select('played_at, role')
    .gte('played_at', fromIso)
    .lte('played_at', toIso);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/* Der jüngste Build zuerst – bei mehreren mit denselben Perks gewinnt er. */
async function loadBuilds() {
  const { data, error } = await supabase
    .from('builds')
    .select('id, name, role, character, perks')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function analyse() {
  const button = el('import-parse');
  button.disabled = true;

  try {
    const parsed = parseMatchHistory(el('import-input').value);

    if (!parsed.rows.length) {
      rows = [];
      renderPreview();
      return hint('Darin steckt kein auswertbares Match.', 'error');
    }

    // Die Liste ist absteigend sortiert, der Zeitraum steht also an den Enden.
    const newest = parsed.rows[0].payload.played_at;
    const oldest = parsed.rows[parsed.rows.length - 1].payload.played_at;
    const [existing, builds] = await Promise.all([loadExisting(oldest, newest), loadBuilds()]);

    rows = markDuplicates(attachBuilds(parsed.rows, builds), existing);

    renderPreview();

    const duplicates = rows.filter((r) => r.duplicate).length;
    const withBuild = rows.filter((r) => r.buildName).length;
    const summary = [
      `${rows.length} Matches gelesen`,
      withBuild ? `${withBuild} einem Build zugeordnet` : null,
      duplicates ? `${duplicates} davon schon vorhanden` : null,
      parsed.failed.length ? `${parsed.failed.length} übersprungen` : null,
    ].filter(Boolean).join(' · ');

    hint(`${summary}. Die Auswahl lässt sich vor dem Übernehmen anpassen.`);
  } catch (error) {
    rows = [];
    renderPreview();
    hint(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function save() {
  const button = el('import-save');
  const picked = [...document.querySelectorAll('[data-import-row]:checked')]
    .map((box) => rows[Number(box.dataset.importRow)])
    .filter(Boolean);

  if (!picked.length) return;

  button.disabled = true;
  button.textContent = 'Speichere …';

  const { error } = await supabase
    .from('matches')
    .insert(picked.map((row) => ({ ...row.payload, user_id: currentUser.id })));

  if (error) {
    syncSaveButton();
    hint(`Speichern fehlgeschlagen: ${error.message}`, 'error');
    return;
  }

  rows = [];
  el('import-input').value = '';
  renderPreview();
  hint('');
  closeTrackerImport();
  toast(`${picked.length} ${picked.length === 1 ? 'Match' : 'Matches'} importiert.`, 'success');
  await onImported?.();
}

/* Das Fenster folgt dem Muster der übrigen Schubladen der App. */
export function openTrackerImport() {
  const drawer = el('import-drawer');
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  el('import-input').focus();
}

function closeTrackerImport() {
  const drawer = el('import-drawer');
  drawer.classList.remove('is-open');
  setTimeout(() => { drawer.hidden = true; }, 200);
}

/**
 * `refresh` läuft nach einem erfolgreichen Import – die Seite, die den Import
 * einbindet, lädt damit ihre Liste neu.
 */
export function initTrackerImport(user, refresh = null) {
  currentUser = user;
  onImported = refresh;

  el('import-parse').addEventListener('click', analyse);
  el('import-save').addEventListener('click', save);

  document.querySelectorAll('[data-import-close]').forEach((node) => {
    node.addEventListener('click', closeTrackerImport);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !el('import-drawer').hidden) closeTrackerImport();
  });

  mountBookmarklet();
}
