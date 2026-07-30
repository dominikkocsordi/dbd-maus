/*
  Vier Perk-Plätze für das Match-Formular. Die Plätze stehen immer da, auch
  leer; ein Klick öffnet eine durchsuchbare Auswahl mit den Perks der aktuellen
  Rolle. Alles bleibt optional – wer nichts einträgt, speichert einfach nichts.
*/
import { PERKS, perkName, perkOwnerLabel } from './perks.js?v=25';
import { perkIconHtml } from './images.js?v=25';
import { escapeHtml, toast } from './utils.js?v=25';

const SLOT_COUNT = 4;

let slots = Array(SLOT_COUNT).fill(null);
let role = 'killer';
let character = null;
let activeSlot = null;
let notify = () => {};

const $ = (sel) => document.querySelector(sel);
const perkFor = (file) => PERKS.find((p) => p.file === file) ?? null;

// ------------------------------------------------------------------ Plätze --

function renderSlots() {
  const container = $('#f-perks');

  container.innerHTML = slots.map((file, index) => {
    if (!file) {
      return `
        <button type="button" class="perk-slot perk-slot--empty" data-slot="${index}"
                aria-label="Perk ${index + 1} wählen">
          <span class="perk-slot__plus" aria-hidden="true">+</span>
          <span class="perk-slot__name">Perk ${index + 1}</span>
        </button>`;
    }

    const name = perkName(file);
    return `
      <span class="perk-slot-wrap">
        <button type="button" class="perk-slot perk-slot--filled" data-slot="${index}"
                title="${escapeHtml(name)} – zum Tauschen klicken">
          ${perkIconHtml(file, name, 'perk-icon--lg')}
          <span class="perk-slot__name">${escapeHtml(name)}</span>
        </button>
        <button type="button" class="perk-slot__clear" data-clear="${index}"
                title="Perk entfernen" aria-label="${escapeHtml(name)} entfernen">&#10005;</button>
      </span>`;
  }).join('');

  container.querySelectorAll('[data-slot]').forEach((btn) => {
    btn.addEventListener('click', () => openPicker(Number(btn.dataset.slot)));
  });
  container.querySelectorAll('[data-clear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      slots[Number(btn.dataset.clear)] = null;
      renderSlots();
      notify();
    });
  });

  const used = slots.filter(Boolean).length;
  $('#f-perks-hint').textContent = used ? `${used} von ${SLOT_COUNT} gewählt` : '';
}

// ------------------------------------------------------------------ Auswahl --

function matchingPerks() {
  const term = $('#picker-search').value.trim().toLowerCase();

  const list = PERKS.filter((p) => {
    if (p.role !== role) return false;
    if (!term) return true;

    const owner = (perkOwnerLabel(p) ?? '').toLowerCase();
    return p.name.toLowerCase().includes(term) || owner.includes(term);
  });

  // Die Perks des gewählten Charakters zuerst – die sucht man am häufigsten.
  if (!character) return list;
  return [...list].sort((a, b) => (b.owner === character) - (a.owner === character));
}

function renderGrid() {
  const grid = $('#picker-grid');
  const list = matchingPerks();

  if (!list.length) {
    grid.innerHTML = '<p class="empty">Kein Perk passt zur Suche.</p>';
    return;
  }

  grid.innerHTML = list.map((p) => {
    const meta = p.general ? 'Allgemein' : (perkOwnerLabel(p) ?? '');
    const taken = slots.includes(p.file) && slots[activeSlot] !== p.file;

    return `
      <button type="button" class="perk-card perk-card--${p.role}${taken ? ' is-picked' : ''}"
              data-pick="${escapeHtml(p.file)}" title="${escapeHtml(p.name)}${meta ? ` · ${meta}` : ''}">
        ${perkIconHtml(p.file, p.name)}
        <span class="perk-card__text">
          <span class="perk-card__name">${escapeHtml(p.name)}</span>
          <span class="perk-card__meta">${escapeHtml(taken ? 'schon gewählt' : meta)}</span>
        </span>
      </button>`;
  }).join('');

  grid.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => pick(btn.dataset.pick));
  });
}

function pick(file) {
  const other = slots.findIndex((f, i) => f === file && i !== activeSlot);
  if (other !== -1) return toast(`${perkName(file)} steckt schon auf Platz ${other + 1}.`, 'error');

  slots[activeSlot] = file;
  renderSlots();
  notify();
  closePicker();
}

function openPicker(index) {
  activeSlot = index;

  const drawer = $('#perk-picker');
  $('#picker-title').textContent = `Perk ${index + 1} wählen`;
  $('#picker-clear').hidden = !slots[index];
  $('#picker-search').value = '';
  renderGrid();

  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  document.body.classList.add('has-drawer');
  $('#picker-search').focus();
}

function closePicker() {
  const drawer = $('#perk-picker');
  drawer.classList.remove('is-open');
  document.body.classList.remove('has-drawer');
  window.setTimeout(() => { drawer.hidden = true; }, 260);
}

// --------------------------------------------------------------------- API --

/** Aufbau der Plätze und der Auswahl; `onChange` meldet jede Änderung. */
export function initPerkPicker(onChange = () => {}) {
  notify = onChange;

  document.querySelectorAll('[data-picker-close]').forEach((el) => el.addEventListener('click', closePicker));
  $('#picker-search').addEventListener('input', renderGrid);
  $('#picker-clear').addEventListener('click', () => {
    slots[activeSlot] = null;
    renderSlots();
    notify();
    closePicker();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('#perk-picker').hidden) closePicker();
  });

  renderSlots();
}

/** Gewählte Perks in Reihenfolge der Plätze, ohne Lücken. */
export const pickedPerks = () => slots.filter(Boolean);

export function setPickedPerks(list = []) {
  slots = Array.from({ length: SLOT_COUNT }, (_, i) => list[i] ?? null);
  renderSlots();
}

/** Der gewählte Charakter rutscht in der Auswahl nach oben. */
export function setPerkCharacter(id) {
  character = id || null;
  if (!$('#perk-picker').hidden) renderGrid();
}

/** Rollenwechsel: Perks der anderen Rolle passen nicht mehr und fallen raus. */
export function setPerkRole(nextRole) {
  role = nextRole;
  const kept = slots.map((file) => (perkFor(file)?.role === role ? file : null));

  if (kept.some((file, i) => file !== slots[i])) {
    slots = kept;
    renderSlots();
    notify();
  }
}

export function clearPerks() {
  slots = Array(SLOT_COUNT).fill(null);
  renderSlots();
}
