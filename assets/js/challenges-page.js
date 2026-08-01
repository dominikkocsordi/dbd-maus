import { supabase } from './supabase.js?v=35';
import { initAuth } from './auth.js?v=35';
import { CHALLENGES } from './challenges.js?v=35';
import { PERKS, perkName, perkOwnerLabel } from './perks.js?v=35';
import { KILLERS, SURVIVORS, labelFor } from './data.js?v=35';
import { avatarHtml, mountIcons, perkIconHtml } from './images.js?v=35';
import { escapeHtml, fmtDay, fmtNumber, toast } from './utils.js?v=35';

const PERKS_PER_BUILD = 4;

/** Wurf und Annahme je Challenge: { [id]: { role, character, perks } } */
const rolls = {};
const accepted = {};

// ------------------------------------------------------------------ Zufall --

/** Gleichverteilt aus der Liste ziehen (crypto, damit es nicht klumpt). */
function pick(list) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return list[buffer[0] % list.length];
}

function pickMany(list, count) {
  const pool = [...list];
  const out = [];
  while (pool.length && out.length < count) {
    const item = pick(pool);
    out.push(item);
    pool.splice(pool.indexOf(item), 1);
  }
  return out;
}

const roster = (role) => (role === 'killer' ? KILLERS : SURVIVORS).filter((c) => !c.id.startsWith('other_'));

function cardOf(id) {
  return document.querySelector(`[data-challenge="${id}"]`);
}

/** Was der Wurf umfasst: alles, nur der Charakter oder nur die Perks. */
function selectedScope(id) {
  return cardOf(id).querySelector(`input[name="scope-${id}"]:checked`).value;
}

function selectedRole(id) {
  const value = cardOf(id).querySelector(`input[name="role-${id}"]:checked`).value;
  return value === 'random' ? pick(['killer', 'survivor']) : value;
}

/**
 * Perk-Pool: alle Perks der Rolle, optional nur die des Charakters.
 * Namensgleiche Einträge (dieselbe Fähigkeit mit zwei Icon-Dateien) kommen nur
 * einmal in den Topf, sonst könnte ein Build sie doppelt enthalten.
 */
function perkPool(id, role, character) {
  const seen = new Set();
  const ofRole = PERKS.filter((p) => {
    if (p.role !== role || seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  if (!character || !cardOf(id).querySelector('[data-own-perks]').checked) return ofRole;

  const restricted = ofRole.filter((p) => p.general || p.owner === character);
  // Weniger als vier eigene Perks -> lieber der volle Pool als ein halber Build.
  return restricted.length >= PERKS_PER_BUILD ? restricted : ofRole;
}

function rollFor(id) {
  const scope = selectedScope(id);
  const previous = rolls[id];

  // Bei Teilwürfen bleibt die Rolle des vorherigen Wurfs stehen, sonst würden
  // behaltene Perks nicht mehr zum Charakter passen.
  const role = previous && scope !== 'all' ? previous.role : selectedRole(id);
  const character = scope === 'perks'
    ? (previous?.character ?? null)
    : pick(roster(role)).id;
  const perks = scope === 'character'
    ? (previous?.perks ?? [])
    : pickMany(perkPool(id, role, character), PERKS_PER_BUILD).map((p) => p.file);

  rolls[id] = { role, character, perks };
  delete accepted[id];

  renderCard(id);
}

/** Einzelnen Perk neu ziehen, ohne Dubletten im Build. */
function rerollPerk(id, index) {
  const roll = rolls[id];
  if (!roll) return;

  const pool = perkPool(id, roll.role, roll.character).filter((p) => !roll.perks.includes(p.file));
  if (!pool.length) return;

  roll.perks = roll.perks.map((file, i) => (i === index ? pick(pool).file : file));
  renderCard(id);
}

function rerollCharacter(id) {
  const roll = rolls[id];
  if (!roll) return;

  roll.character = pick(roster(roll.role).filter((c) => c.id !== roll.character)).id;
  renderCard(id);
}

// ------------------------------------------------------------------- Build --

async function acceptChallenge(id) {
  const roll = rolls[id];
  if (!roll) return;

  const card = cardOf(id);
  const button = card.querySelector('[data-accept]');
  const who = roll.character ? labelFor(roll.role, roll.character) : (roll.role === 'killer' ? 'Killer' : 'Survivor');
  const name = `Zufall · ${who} · ${fmtDay(new Date())}`.slice(0, 60);

  button.disabled = true;
  const { error } = await supabase.from('builds').insert({
    name,
    role: roll.role,
    character: roll.character ?? null,
    perks: roll.perks,
  });
  button.disabled = false;

  if (error) {
    const hint = card.querySelector('[data-hint]');
    hint.textContent = `Speichern fehlgeschlagen: ${error.message}`;
    hint.className = 'form-hint form-hint--error';
    return;
  }

  accepted[id] = name;
  toast('Challenge angenommen – Build gespeichert.', 'success');
  renderCard(id);
}

// ------------------------------------------------------------------ Render --

function resultHtml(id) {
  const roll = rolls[id];
  if (!roll || (!roll.character && !roll.perks.length)) {
    return '<p class="empty">Noch nichts ausgewürfelt.</p>';
  }

  const label = roll.character ? labelFor(roll.role, roll.character) : null;

  return `
    ${!roll.character ? '' : `
    <div class="roll-character">
      ${avatarHtml(roll.role, roll.character, label, 'avatar--lg')}
      <div class="roll-character__text">
        <span class="roll-character__name">${escapeHtml(label)}</span>
        <span class="roll-character__role">${roll.role === 'killer' ? 'Killer' : 'Survivor'}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" data-reroll-character>Charakter neu</button>
    </div>`}

    <div class="roll-perks">
      ${roll.perks.map((file, i) => {
        const perk = PERKS.find((p) => p.file === file);
        const meta = perk?.general ? 'Allgemein' : (perkOwnerLabel(perk) ?? '');
        return `
          <div class="roll-perk">
            ${perkIconHtml(file, perkName(file), 'perk-icon--lg')}
            <span class="roll-perk__text">
              <span class="roll-perk__name">${escapeHtml(perkName(file))}</span>
              <span class="roll-perk__meta">${escapeHtml(meta)}</span>
            </span>
            <button type="button" class="icon-btn" data-reroll="${i}" title="Diesen Perk neu ziehen">&#8635;</button>
          </div>`;
      }).join('')}
    </div>`;
}

function generatorHtml(id) {
  return `
    <div class="generator">
      <div class="generator__controls">
        <fieldset class="field">
          <legend class="field__label">Rolle</legend>
          <div class="segmented" role="radiogroup" aria-label="Rolle">
            <label class="segmented__opt">
              <input type="radio" name="role-${id}" value="killer" checked>
              <span><span class="icon" data-icon="killer"></span>Killer</span>
            </label>
            <label class="segmented__opt">
              <input type="radio" name="role-${id}" value="survivor">
              <span><span class="icon" data-icon="survivor"></span>Survivor</span>
            </label>
            <label class="segmented__opt">
              <input type="radio" name="role-${id}" value="random">
              <span>Zufall</span>
            </label>
          </div>
        </fieldset>

        <fieldset class="field">
          <legend class="field__label">Auswürfeln</legend>
          <div class="segmented" role="radiogroup" aria-label="Umfang">
            <label class="segmented__opt">
              <input type="radio" name="scope-${id}" value="all" checked><span>Alles</span>
            </label>
            <label class="segmented__opt">
              <input type="radio" name="scope-${id}" value="character"><span>Charakter</span>
            </label>
            <label class="segmented__opt">
              <input type="radio" name="scope-${id}" value="perks"><span>Perks</span>
            </label>
          </div>
        </fieldset>

        <label class="check">
          <input type="checkbox" data-own-perks>
          <span>Nur eigene Perks des Charakters (plus allgemeine)</span>
        </label>

        <div class="settings-row">
          <button type="button" class="btn btn--ghost" data-roll>Würfeln</button>
          <button type="button" class="btn btn--primary" data-accept ${rolls[id]?.character || rolls[id]?.perks.length ? '' : 'disabled'}>Challenge annehmen</button>
        </div>
        <p class="form-hint" data-hint>${accepted[id]
          ? `Angenommen – „${escapeHtml(accepted[id])}“ liegt als Build bereit. <a href="index.html">Match eintragen</a>`
          : ''}</p>
      </div>

      <div class="generator__result" data-result>${resultHtml(id)}</div>
    </div>`;
}

function cardHtml(challenge) {
  const roll = rolls[challenge.id];
  const isAccepted = Boolean(accepted[challenge.id]);

  return `
    <article class="challenge-card${isAccepted ? ' challenge-card--accepted' : ''}" data-challenge="${challenge.id}">
      <header class="challenge-card__head">
        <h2 class="challenge-card__title">${escapeHtml(challenge.title)}</h2>
        ${isAccepted
          ? '<span class="challenge-card__badge challenge-card__badge--done">Angenommen</span>'
          : (roll ? '<span class="challenge-card__badge">Ausgewürfelt</span>' : '')}
        <span class="challenge-card__meta">${roll
          ? `${roll.role === 'killer' ? 'Killer' : 'Survivor'}${roll.perks.length
              ? ` · ${fmtNumber(perkPool(challenge.id, roll.role, roll.character).length)} Perks im Topf`
              : ''}`
          : escapeHtml(challenge.tagline)}</span>
      </header>

      <p class="challenge-card__rules">${challenge.rules.map((r) => escapeHtml(r)).join(' · ')}</p>

      ${challenge.generator ? generatorHtml(challenge.id) : ''}
    </article>`;
}

function wireCard(id) {
  const card = cardOf(id);
  if (!card) return;

  card.querySelector('[data-roll]')?.addEventListener('click', () => rollFor(id));
  card.querySelector('[data-accept]')?.addEventListener('click', () => acceptChallenge(id));
  card.querySelector('[data-reroll-character]')?.addEventListener('click', () => rerollCharacter(id));
  card.querySelectorAll('[data-reroll]').forEach((btn) => {
    btn.addEventListener('click', () => rerollPerk(id, Number(btn.dataset.reroll)));
  });
  card.querySelectorAll(`input[name="role-${id}"]`).forEach((radio) => {
    radio.addEventListener('change', () => { delete rolls[id]; delete accepted[id]; renderCard(id); });
  });
  card.querySelectorAll(`input[name="scope-${id}"]`).forEach((radio) => {
    radio.addEventListener('change', () => renderCard(id));
  });
  card.querySelector('[data-own-perks]')?.addEventListener('change', () => renderCard(id));

  mountIcons(card);
}

/** Eine Karte neu aufbauen; der Zustand steckt in `rolls`/`accepted`. */
function renderCard(id) {
  const challenge = CHALLENGES.find((c) => c.id === id);
  const card = cardOf(id);
  if (!challenge || !card) return;

  const ownPerks = card.querySelector('[data-own-perks]')?.checked;
  const role = card.querySelector(`input[name="role-${id}"]:checked`)?.value;
  const scope = card.querySelector(`input[name="scope-${id}"]:checked`)?.value;

  card.outerHTML = cardHtml(challenge);

  // Einstellungen überleben das Neuzeichnen
  const fresh = cardOf(id);
  if (ownPerks) fresh.querySelector('[data-own-perks]').checked = true;
  if (role) fresh.querySelector(`input[name="role-${id}"][value="${role}"]`).checked = true;
  if (scope) fresh.querySelector(`input[name="scope-${id}"][value="${scope}"]`).checked = true;

  wireCard(id);
}

function renderChallenges() {
  document.getElementById('challenge-count').textContent =
    `${fmtNumber(CHALLENGES.length)} ${CHALLENGES.length === 1 ? 'Challenge' : 'Challenges'}`;

  document.getElementById('challenge-list').innerHTML = CHALLENGES.map(cardHtml).join('');
  CHALLENGES.forEach((c) => wireCard(c.id));
}

// -------------------------------------------------------------------- Init --

renderChallenges();
initAuth();
