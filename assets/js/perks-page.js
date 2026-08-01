import { supabase } from './supabase.js?v=36';
import { initAuth } from './auth.js?v=36';
import { PERKS, perkName, perkOwnerLabel } from './perks.js?v=36';
import { KILLERS, SURVIVORS, labelFor } from './data.js?v=36';
import { avatarHtml, mountIcons, perkIconHtml } from './images.js?v=36';
import { escapeHtml, fmtNumber, toast } from './utils.js?v=36';

const MAX_PERKS = 4;

let builds = [];
let editingId = null;
let draft = { role: 'killer', perks: [] };

const els = {
  search: document.getElementById('fp-search'),
  role: document.getElementById('fp-role'),
  owner: document.getElementById('fp-owner'),
  character: document.getElementById('fp-character'),
};

// ------------------------------------------------------------- Perk-Katalog --

function buildRole() {
  return document.querySelector('input[name="build-role"]:checked').value;
}

function fillCharacterSelects() {
  const options = (list) => list
    .filter((c) => !c.id.startsWith('other_'))
    .map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');

  els.character.innerHTML = '<option value="all">Alle</option>'
    + `<optgroup label="Killer">${options(KILLERS)}</optgroup>`
    + `<optgroup label="Survivor">${options(SURVIVORS)}</optgroup>`;

  syncBuildCharacterSelect();
}

/** Im Build-Editor passen die Charaktere zur gewählten Rolle. */
function syncBuildCharacterSelect(keep = true) {
  const select = document.getElementById('b-character');
  const previous = keep ? select.value : '';
  const list = buildRole() === 'killer' ? KILLERS : SURVIVORS;

  select.innerHTML = '<option value="">Kein Eintrag</option>'
    + list.filter((c) => !c.id.startsWith('other_'))
      .map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');

  select.value = [...select.options].some((o) => o.value === previous) ? previous : '';
  syncBuildPortrait();
}

function syncBuildPortrait() {
  const select = document.getElementById('b-character');
  const target = document.getElementById('b-character-portrait');
  target.innerHTML = select.value
    ? avatarHtml(buildRole(), select.value, labelFor(buildRole(), select.value), 'avatar--lg')
    : '';
}

function filteredPerks() {
  const term = els.search.value.trim().toLowerCase();
  const role = els.role.value;
  const owner = els.owner.value;
  const character = els.character.value;

  return PERKS.filter((p) => {
    if (role !== 'all' && p.role !== role) return false;
    // Die Suche greift auch auf den Besitzer, damit "feng" alle Feng-Perks findet.
    if (term) {
      const ownerText = (perkOwnerLabel(p) ?? '').toLowerCase();
      if (!p.name.toLowerCase().includes(term) && !ownerText.includes(term)) return false;
    }
    if (owner === 'general' && !p.general) return false;
    if (owner === 'character' && !p.owner) return false;
    if (owner === 'unknown' && (p.general || p.owner)) return false;
    if (character !== 'all' && p.owner !== character) return false;
    return true;
  });
}

function renderPerkGrid() {
  const grid = document.getElementById('perk-grid');
  const list = filteredPerks();
  const inDraft = new Set(draft.perks);

  document.getElementById('filter-info').textContent =
    `${fmtNumber(list.length)} von ${fmtNumber(PERKS.length)}`;

  if (!list.length) {
    grid.innerHTML = '<p class="empty">Kein Perk passt zu diesem Filter.</p>';
    return;
  }

  grid.innerHTML = list.map((p) => {
    const ownerLabel = perkOwnerLabel(p);
    const meta = p.general ? 'Allgemein' : (ownerLabel ?? '');
    const selectable = p.role === draft.role;

    return `
      <button type="button" class="perk-card perk-card--${p.role}${inDraft.has(p.file) ? ' is-picked' : ''}"
              data-perk="${escapeHtml(p.file)}" ${selectable ? '' : 'data-wrong-role="1"'}
              title="${escapeHtml(p.name)}${meta ? ` · ${meta}` : ''}">
        ${perkIconHtml(p.file, p.name)}
        <span class="perk-card__text">
          <span class="perk-card__name">${escapeHtml(p.name)}</span>
          <span class="perk-card__meta${p.general || p.owner ? '' : ' perk-card__meta--open'}">${escapeHtml(meta)}</span>
        </span>
      </button>`;
  }).join('');

  grid.querySelectorAll('[data-perk]').forEach((btn) => {
    btn.addEventListener('click', () => togglePerk(btn.dataset.perk));
  });
}

// -------------------------------------------------------------- Build-Editor --

function renderSlots() {
  const container = document.getElementById('build-slots');

  container.innerHTML = Array.from({ length: MAX_PERKS }, (_, i) => {
    const file = draft.perks[i];
    if (!file) return '<span class="build-slot build-slot--empty" aria-hidden="true"></span>';
    return `
      <button type="button" class="build-slot" data-remove="${escapeHtml(file)}"
              title="${escapeHtml(perkName(file))} entfernen">
        ${perkIconHtml(file, perkName(file), 'perk-icon--lg')}
        <span class="build-slot__name">${escapeHtml(perkName(file))}</span>
      </button>`;
  }).join('');

  container.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => togglePerk(btn.dataset.remove));
  });

  document.getElementById('build-hint').textContent =
    `${draft.perks.length}/${MAX_PERKS} Perks`;
}

function togglePerk(file) {
  const perk = PERKS.find((p) => p.file === file);
  if (!perk) return;

  if (draft.perks.includes(file)) {
    draft.perks = draft.perks.filter((f) => f !== file);
  } else {
    if (perk.role !== draft.role) {
      return toast(`${perk.name} ist ein ${perk.role === 'killer' ? 'Killer' : 'Survivor'}-Perk.`, 'error');
    }
    if (draft.perks.length >= MAX_PERKS) return toast('Ein Build hat maximal 4 Perks.', 'error');
    draft.perks = [...draft.perks, file];
  }

  renderSlots();
  renderPerkGrid();
}

function applyDraftRole() {
  draft.role = buildRole();
  // Perks der anderen Rolle passen nicht mehr in den Build
  const dropped = draft.perks.filter((f) => PERKS.find((p) => p.file === f)?.role !== draft.role);
  if (dropped.length) draft.perks = draft.perks.filter((f) => !dropped.includes(f));

  syncBuildCharacterSelect(false);
  renderSlots();
  renderPerkGrid();
}

function resetDraft() {
  editingId = null;
  draft = { role: buildRole(), perks: [] };
  document.getElementById('b-name').value = '';
  document.getElementById('b-character').value = '';
  document.getElementById('build-title').textContent = 'Neuer Build';
  document.getElementById('b-submit').textContent = 'Build speichern';
  document.getElementById('build-panel').classList.remove('panel--editing');
  syncBuildPortrait();
  renderSlots();
  renderPerkGrid();
}

function startEditBuild(id) {
  const build = builds.find((b) => b.id === id);
  if (!build) return;

  editingId = id;
  draft = { role: build.role, perks: [...(build.perks ?? [])] };
  document.querySelector(`input[name="build-role"][value="${build.role}"]`).checked = true;
  syncBuildCharacterSelect(false);
  document.getElementById('b-name').value = build.name;
  document.getElementById('b-character').value = build.character ?? '';
  document.getElementById('build-title').textContent = 'Build bearbeiten';
  document.getElementById('b-submit').textContent = 'Änderungen speichern';
  document.getElementById('build-panel').classList.add('panel--editing');
  syncBuildPortrait();
  renderSlots();
  renderPerkGrid();
  document.getElementById('build-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveBuild(event) {
  event.preventDefault();
  const name = document.getElementById('b-name').value.trim();
  if (!name) return toast('Bitte einen Namen für den Build eintragen.', 'error');
  if (!draft.perks.length) return toast('Bitte mindestens einen Perk auswählen.', 'error');

  const payload = {
    name,
    role: draft.role,
    character: document.getElementById('b-character').value || null,
    perks: draft.perks,
  };

  const submit = document.getElementById('b-submit');
  submit.disabled = true;

  const { error } = editingId
    ? await supabase.from('builds').update(payload).eq('id', editingId)
    : await supabase.from('builds').insert(payload);

  submit.disabled = false;
  if (error) return toast(`Speichern fehlgeschlagen: ${error.message}`, 'error');

  toast(editingId ? 'Build aktualisiert.' : 'Build gespeichert.', 'success');
  resetDraft();
  await loadBuilds();
}

async function deleteBuild(id) {
  if (!window.confirm('Diesen Build wirklich löschen?')) return;
  const { error } = await supabase.from('builds').delete().eq('id', id);
  if (error) return toast(`Löschen fehlgeschlagen: ${error.message}`, 'error');

  toast('Build gelöscht.');
  if (editingId === id) resetDraft();
  await loadBuilds();
}

/**
 * Builds nach Charakter bündeln: erst die Killer, dann die Survivor, jeweils
 * alphabetisch. Builds ohne Charakter landen am Ende ihrer Rolle.
 */
function buildGroups() {
  const groups = new Map();

  for (const b of builds) {
    const key = `${b.role}|${b.character ?? ''}`;
    if (!groups.has(key)) {
      groups.set(key, { role: b.role, character: b.character ?? null, items: [] });
    }
    groups.get(key).items.push(b);
  }

  const label = (g) => (g.character ? labelFor(g.role, g.character) : '');

  return [...groups.values()]
    .map((g) => ({ ...g, items: [...g.items].sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'killer' ? -1 : 1;
      if (!a.character !== !b.character) return a.character ? -1 : 1;   // ohne Charakter zuletzt
      return label(a).localeCompare(label(b), 'de');
    });
}

function buildCardHtml(b) {
  const perks = b.perks ?? [];
  return `
    <article class="build-card build-card--${b.role}">
      <header class="build-card__head">
        <span class="build-card__text">
          <span class="build-card__name">${escapeHtml(b.name)}</span>
          <span class="build-card__meta">${fmtNumber(perks.length)} ${perks.length === 1 ? 'Perk' : 'Perks'}</span>
        </span>
        <span class="row-actions">
          <button type="button" class="icon-btn" data-edit-build="${b.id}" title="Bearbeiten" aria-label="Build bearbeiten">&#9998;</button>
          <button type="button" class="icon-btn icon-btn--danger" data-delete-build="${b.id}" title="Löschen" aria-label="Build löschen">&#10005;</button>
        </span>
      </header>
      <div class="build-card__perks">
        ${perks.map((f) => perkIconHtml(f, perkName(f))).join('')}
      </div>
    </article>`;
}

function renderBuilds() {
  const list = document.getElementById('build-list');
  document.getElementById('build-count').textContent = builds.length ? fmtNumber(builds.length) : '';

  if (!builds.length) {
    list.innerHTML = '<p class="empty">Noch kein Build gespeichert – Perks unten anklicken und oben speichern.</p>';
    return;
  }

  list.innerHTML = buildGroups().map((g) => `
    <section class="build-group build-group--${g.role}">
      <header class="build-group__head">
        ${g.character
          ? avatarHtml(g.role, g.character, labelFor(g.role, g.character))
          : `<span class="avatar avatar--${g.role}"><span class="avatar__fallback">&#8211;</span></span>`}
        <span class="build-group__text">
          <span class="build-group__name">${escapeHtml(g.character ? labelFor(g.role, g.character) : 'Ohne Charakter')}</span>
          <span class="build-group__role">${g.role === 'killer' ? 'Killer' : 'Survivor'}</span>
        </span>
        <span class="build-group__count">${fmtNumber(g.items.length)}</span>
      </header>
      <div class="build-list">${g.items.map(buildCardHtml).join('')}</div>
    </section>`).join('');

  list.querySelectorAll('[data-edit-build]').forEach((btn) => {
    btn.addEventListener('click', () => startEditBuild(btn.dataset.editBuild));
  });
  list.querySelectorAll('[data-delete-build]').forEach((btn) => {
    btn.addEventListener('click', () => deleteBuild(btn.dataset.deleteBuild));
  });
}

async function loadBuilds() {
  const { data, error } = await supabase
    .from('builds')
    .select('id, name, role, character, perks, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    toast(`Builds konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  builds = data ?? [];
  renderBuilds();
}

// --------------------------------------------------------------------- Init --

function initPerkPage() {
  document.getElementById('perk-count').textContent = `${fmtNumber(PERKS.length)} Perks`;
  fillCharacterSelects();

  [els.search, els.role, els.owner, els.character].forEach((el) => {
    el.addEventListener('input', renderPerkGrid);
    el.addEventListener('change', renderPerkGrid);
  });

  document.querySelectorAll('input[name="build-role"]').forEach((radio) => {
    radio.addEventListener('change', applyDraftRole);
  });
  document.getElementById('b-character').addEventListener('change', syncBuildPortrait);
  document.getElementById('build-form').addEventListener('submit', saveBuild);
  document.getElementById('b-reset').addEventListener('click', resetDraft);

  mountIcons();
  renderSlots();
  renderPerkGrid();
}

initPerkPage();
initAuth({
  onLogin: () => loadBuilds(),
  onLogout: () => { builds = []; },
});
