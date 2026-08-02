/*
  Vier Perk-Plätze für das Match-Formular. Jeder Platz ist ein Dropdown mit
  Vorschaubild: die Perks des gewählten Charakters stehen oben, danach die
  allgemeinen und zuletzt der Rest. Schon belegte Perks sind in den anderen
  Plätzen ausgegraut. Alles bleibt optional – leer heißt einfach "nichts".
*/
import { PERKS, perkName, perkOwnerLabel } from './perks.js?v=57';
import { perkIconHtml } from './images.js?v=57';
import { escapeHtml } from './utils.js?v=57';

const SLOT_COUNT = 4;

let slots = Array(SLOT_COUNT).fill(null);
let terms = Array(SLOT_COUNT).fill('');
let role = 'killer';
let character = null;
let notify = () => {};

const container = () => document.getElementById('f-perks');

/** Perks der aktuellen Rolle, gefiltert und gebündelt für die <optgroup>-Blöcke. */
function groupedPerks(chosen, term) {
  const needle = term.trim().toLowerCase();

  const list = PERKS.filter((p) => {
    if (p.role !== role) return false;
    // Der gewählte Perk bleibt immer im Menü, sonst wäre er beim Filtern weg.
    if (!needle || p.file === chosen) return true;

    const owner = (perkOwnerLabel(p) ?? '').toLowerCase();
    return p.name.toLowerCase().includes(needle) || owner.includes(needle);
  });
  const byName = (a, b) => a.name.localeCompare(b.name, 'de');

  const own = character ? list.filter((p) => p.owner === character).sort(byName) : [];
  const general = list.filter((p) => p.general).sort(byName);
  const rest = list.filter((p) => !p.general && !own.includes(p)).sort(byName);

  return [
    own.length ? { label: perkOwnerLabel(own[0]) ?? 'Charakter', perks: own } : null,
    general.length ? { label: 'Allgemein', perks: general } : null,
    rest.length ? { label: own.length || general.length ? 'Weitere Perks' : 'Perks', perks: rest } : null,
  ].filter(Boolean);
}

function optionsHtml(index) {
  const chosen = slots[index];
  const groups = groupedPerks(chosen, terms[index]);
  if (!groups.length) return '<option value="">Kein Perk passt zur Suche</option>';

  return `<option value="">Perk ${index + 1} wählen …</option>`
    + groups.map(({ label, perks }) => `
      <optgroup label="${escapeHtml(label)}">
        ${perks.map((p) => {
    // In einem anderen Platz belegte Perks lassen sich nicht doppelt wählen.
    const taken = slots.includes(p.file) && p.file !== chosen;
    return `<option value="${escapeHtml(p.file)}"${p.file === chosen ? ' selected' : ''}${taken ? ' disabled' : ''}>`
      + `${escapeHtml(p.name)}${taken ? ' – schon gewählt' : ''}</option>`;
  }).join('')}
      </optgroup>`).join('');
}

function render() {
  const root = container();

  root.innerHTML = slots.map((file, index) => `
    <div class="perk-pick${file ? ' is-filled' : ''}">
      ${file
    ? perkIconHtml(file, perkName(file))
    : '<span class="perk-icon perk-icon--empty" aria-hidden="true"></span>'}
      <div class="perk-pick__fields">
        <label class="sr-only" for="f-perk-search-${index}">Perk ${index + 1} suchen</label>
        <input type="search" class="perk-pick__search" id="f-perk-search-${index}" data-search="${index}"
               value="${escapeHtml(terms[index])}" placeholder="Suchen …" autocomplete="off">
        <select class="perk-pick__select" data-slot="${index}" aria-label="Perk ${index + 1}">
          ${optionsHtml(index)}
        </select>
      </div>
      ${file ? `<button type="button" class="icon-btn icon-btn--danger" data-clear="${index}"
                        title="Perk entfernen" aria-label="${escapeHtml(perkName(file))} entfernen">&#10005;</button>` : ''}
    </div>`).join('');

  root.querySelectorAll('[data-slot]').forEach((select) => {
    select.addEventListener('change', () => {
      slots[Number(select.dataset.slot)] = select.value || null;
      render();
      notify();
    });
  });

  /*
    Beim Tippen wird nur die Liste des eigenen Platzes neu aufgebaut – ein
    kompletter Neuaufbau würde den Fokus aus dem Suchfeld werfen.
  */
  root.querySelectorAll('[data-search]').forEach((input) => {
    input.addEventListener('input', () => {
      const index = Number(input.dataset.search);
      terms[index] = input.value;
      root.querySelector(`[data-slot="${index}"]`).innerHTML = optionsHtml(index);
    });
  });

  root.querySelectorAll('[data-clear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      slots[Number(btn.dataset.clear)] = null;
      render();
      notify();
    });
  });

  const used = slots.filter(Boolean).length;
  document.getElementById('f-perks-hint').textContent = used ? `${used} von ${SLOT_COUNT} gewählt` : '';
}

// --------------------------------------------------------------------- API --

export function initPerkPicker(onChange = () => {}) {
  notify = onChange;
  render();
}

/** Gewählte Perks in Reihenfolge der Plätze, ohne Lücken. */
export const pickedPerks = () => slots.filter(Boolean);

export function setPickedPerks(list = []) {
  slots = Array.from({ length: SLOT_COUNT }, (_, i) => list[i] ?? null);
  render();
}

/** Rollenwechsel: Perks der anderen Rolle passen nicht mehr und fallen raus. */
export function setPerkRole(nextRole) {
  role = nextRole;
  const kept = slots.map((file) => (PERKS.find((p) => p.file === file)?.role === role ? file : null));
  const changed = kept.some((file, i) => file !== slots[i]);

  slots = kept;
  render();
  if (changed) notify();
}

/** Der gewählte Charakter bekommt in jedem Dropdown die erste Gruppe. */
export function setPerkCharacter(id) {
  if (character === (id || null)) return;
  character = id || null;
  render();
}

export function clearPerks() {
  slots = Array(SLOT_COUNT).fill(null);
  terms = Array(SLOT_COUNT).fill('');
  render();
}
