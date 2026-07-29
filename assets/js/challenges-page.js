import { supabase } from './supabase.js?v=12';
import { initAuth } from './auth.js?v=12';
import { CHALLENGES } from './challenges.js?v=12';
import { PERKS, perkName, perkOwnerLabel } from './perks.js?v=12';
import { KILLERS, SURVIVORS, labelFor } from './data.js?v=12';
import { avatarHtml, mountIcons, perkIconHtml } from './images.js?v=12';
import { escapeHtml, fmtDay, fmtNumber, toast } from './utils.js?v=12';

const PERKS_PER_BUILD = 4;

/** Aktuelles Wurfergebnis: { role, character, perks: [file] } */
let roll = null;

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

function selectedRole() {
  const value = document.querySelector('input[name="gen-role"]:checked').value;
  return value === 'random' ? pick(['killer', 'survivor']) : value;
}

/** Perk-Pool: alle Perks der Rolle, optional nur die des Charakters. */
function perkPool(role, character) {
  const ofRole = PERKS.filter((p) => p.role === role);
  if (!document.getElementById('gen-own-perks').checked) return ofRole;

  const restricted = ofRole.filter((p) => p.general || p.owner === character);
  // Weniger als vier eigene Perks -> lieber der volle Pool als ein halber Build.
  return restricted.length >= PERKS_PER_BUILD ? restricted : ofRole;
}

function rollAll() {
  const role = selectedRole();
  const roster = (role === 'killer' ? KILLERS : SURVIVORS).filter((c) => !c.id.startsWith('other_'));
  const character = pick(roster).id;

  roll = {
    role,
    character,
    perks: pickMany(perkPool(role, character), PERKS_PER_BUILD).map((p) => p.file),
  };

  renderResult();
}

/** Einzelnen Perk neu ziehen, ohne Dubletten im Build. */
function rerollPerk(index) {
  if (!roll) return;
  const pool = perkPool(roll.role, roll.character).filter((p) => !roll.perks.includes(p.file));
  if (!pool.length) return;

  roll.perks = roll.perks.map((file, i) => (i === index ? pick(pool).file : file));
  renderResult();
}

function rerollCharacter() {
  if (!roll) return;
  const roster = (roll.role === 'killer' ? KILLERS : SURVIVORS)
    .filter((c) => !c.id.startsWith('other_') && c.id !== roll.character);

  roll.character = pick(roster).id;
  renderResult();
}

// ------------------------------------------------------------------ Render --

function renderResult() {
  const container = document.getElementById('gen-result');
  document.getElementById('gen-save').disabled = !roll;
  document.getElementById('gen-hint').textContent = '';

  if (!roll) {
    container.innerHTML = '<p class="empty">Noch nichts ausgewürfelt.</p>';
    document.getElementById('roll-meta').textContent = '';
    return;
  }

  const label = labelFor(roll.role, roll.character);
  document.getElementById('roll-meta').textContent =
    `${roll.role === 'killer' ? 'Killer' : 'Survivor'} · ${fmtNumber(perkPool(roll.role, roll.character).length)} Perks im Topf`;

  container.innerHTML = `
    <div class="roll-character">
      ${avatarHtml(roll.role, roll.character, label, 'avatar--lg')}
      <div class="roll-character__text">
        <span class="roll-character__name">${escapeHtml(label)}</span>
        <span class="roll-character__role">${roll.role === 'killer' ? 'Killer' : 'Survivor'}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" id="reroll-character">Charakter neu</button>
    </div>

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

  container.querySelectorAll('[data-reroll]').forEach((btn) => {
    btn.addEventListener('click', () => rerollPerk(Number(btn.dataset.reroll)));
  });
  document.getElementById('reroll-character').addEventListener('click', rerollCharacter);
}

function renderChallenges() {
  const list = document.getElementById('challenge-list');
  document.getElementById('challenge-count').textContent =
    `${fmtNumber(CHALLENGES.length)} ${CHALLENGES.length === 1 ? 'Challenge' : 'Challenges'}`;

  list.innerHTML = CHALLENGES.map((c) => `
    <article class="challenge-card">
      <header class="challenge-card__head">
        <h2 class="challenge-card__title">${escapeHtml(c.title)}</h2>
        ${c.generator ? '<span class="challenge-card__badge">Generator</span>' : ''}
      </header>
      <p class="challenge-card__tagline">${escapeHtml(c.tagline)}</p>
      <ul class="challenge-card__rules">
        ${c.rules.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
      ${c.generator ? '<button type="button" class="btn btn--primary btn--sm" data-start="1">Auswürfeln</button>' : ''}
    </article>`).join('');

  list.querySelectorAll('[data-start]').forEach((btn) => {
    btn.addEventListener('click', () => {
      rollAll();
      document.getElementById('generator-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ------------------------------------------------------------------- Build --

async function saveAsBuild() {
  if (!roll) return;

  const button = document.getElementById('gen-save');
  const name = `Zufall · ${labelFor(roll.role, roll.character)} · ${fmtDay(new Date())}`;

  button.disabled = true;
  const { error } = await supabase.from('builds').insert({
    name: name.slice(0, 60),
    role: roll.role,
    character: roll.character,
    perks: roll.perks,
  });
  button.disabled = false;

  if (error) {
    document.getElementById('gen-hint').textContent = `Speichern fehlgeschlagen: ${error.message}`;
    document.getElementById('gen-hint').className = 'form-hint form-hint--error';
    return;
  }

  toast('Build gespeichert – im Match-Formular auswählbar.', 'success');
  document.getElementById('gen-hint').textContent = `„${name}“ liegt jetzt unter Perks & Builds.`;
  document.getElementById('gen-hint').className = 'form-hint form-hint--success';
}

// -------------------------------------------------------------------- Init --

renderChallenges();
renderResult();
mountIcons();

document.getElementById('gen-roll').addEventListener('click', rollAll);
document.getElementById('gen-save').addEventListener('click', saveAsBuild);
document.getElementById('gen-own-perks').addEventListener('change', () => {
  if (roll) renderResult();
});
document.querySelectorAll('input[name="gen-role"]').forEach((radio) => {
  radio.addEventListener('change', () => { roll = null; renderResult(); });
});

initAuth();
