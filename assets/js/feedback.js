/*
  Feedback-Dock: ein schwebender Button, der auf jeder Seite mitläuft und ein
  Panel aufklappt. Darin lässt sich ein Ticket melden und der eigene Bestand
  einsehen – dadurch braucht es keinen Navigationspunkt mehr, und gemeldet
  werden kann direkt dort, wo etwas auffällt.
*/
import { supabase } from './supabase.js?v=39';
import { escapeHtml, fmtDate, toast } from './utils.js?v=39';
import {
  PAGE_LABELS, currentPageKey, isClosed, kindBadge, pageLabel, statusBadge,
} from './tickets-shared.js?v=39';

// Merkt sich, welchen Stand eines Tickets der Melder schon gesehen hat.
const SEEN_KEY = 'dbd:tickets:seen';

let currentUser = null;
let tickets = [];
let editingId = null;
let dock = null;
let loaded = false;

const $ = (sel) => dock?.querySelector(sel);

const MARKUP = /* html */ `
  <button type="button" class="fab" id="fb-open" aria-haspopup="dialog" aria-expanded="false">
    <span class="fab__glyph" aria-hidden="true">&#128172;</span>
    <span class="fab__text">Feedback</span>
    <span class="fab__badge" id="fb-badge" hidden></span>
  </button>

  <div class="drawer" id="fb-drawer" hidden>
    <div class="drawer__scrim" data-fb-close></div>

    <aside class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="fb-heading">
      <header class="drawer__head">
        <h2 class="drawer__title" id="fb-heading">Feedback</h2>
        <button type="button" class="icon-btn" data-fb-close aria-label="Schließen">&#10005;</button>
      </header>

      <div class="drawer__tabs">
        <div class="tabs" role="tablist" aria-label="Feedback">
          <button type="button" class="tab is-active" data-fb-tab="form" role="tab">Melden</button>
          <button type="button" class="tab" data-fb-tab="mine" role="tab">
            Meine Tickets <span class="tab__count" id="fb-count">0</span>
          </button>
        </div>
      </div>

      <div class="drawer__body">
        <form id="fb-form" data-fb-view="form" novalidate>
          <fieldset class="field">
            <legend class="field__label">Art</legend>
            <div class="segmented" role="radiogroup" aria-label="Art">
              <label class="segmented__opt segmented__opt--bad">
                <input type="radio" name="fb-kind" value="bug" checked><span>&#128027; Bug</span>
              </label>
              <label class="segmented__opt segmented__opt--good">
                <input type="radio" name="fb-kind" value="feature"><span>&#128161; Wunsch</span>
              </label>
            </div>
          </fieldset>

          <label class="field">
            <span class="field__label">Titel</span>
            <input type="text" id="fb-title" maxlength="120" required placeholder="Kurz und konkret">
          </label>

          <label class="field">
            <span class="field__label">Seite</span>
            <select id="fb-page"></select>
          </label>

          <label class="field">
            <span class="field__label">Beschreibung</span>
            <textarea id="fb-description" rows="6" maxlength="4000" required
                      placeholder="Was passiert, was sollte passieren? Bei Bugs: Schritte zum Nachstellen."></textarea>
          </label>

          <button type="submit" class="btn btn--primary btn--block" id="fb-submit">Absenden</button>
          <button type="button" class="btn btn--ghost btn--block" id="fb-cancel" hidden>Bearbeitung abbrechen</button>
          <p class="form-hint" id="fb-hint"></p>
        </form>

        <div data-fb-view="mine" hidden>
          <div id="fb-list" class="ticket-list"></div>
        </div>
      </div>
    </aside>
  </div>
`;

// ------------------------------------------------------------- Gesehen-Stand --

function readSeen() {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function writeSeen(map) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {
    /* Privatmodus o. ä. – der Zähler ist dann eben nicht persistent. */
  }
}

/** Bearbeitet heißt: Antwort da oder Status weitergedreht. */
const isAnswered = (t) => !isClosed(t) && (Boolean(t.owner_note) || t.status !== 'new');

const unseenTickets = () => {
  const seen = readSeen();
  return tickets.filter((t) => isAnswered(t) && seen[t.id] !== t.updated_at);
};

function markSeen() {
  const seen = {};
  tickets.forEach((t) => { seen[t.id] = t.updated_at; });
  writeSeen(seen);
  renderBadge();
}

function renderBadge() {
  const badge = $('#fb-badge');
  if (!badge) return;

  const count = unseenTickets().length;
  badge.textContent = String(count);
  badge.hidden = count === 0;
  $('#fb-open')?.classList.toggle('fab--alert', count > 0);
}

// -------------------------------------------------------------------- Panel --

function setTab(name) {
  dock.querySelectorAll('[data-fb-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.fbTab === name));
  dock.querySelectorAll('[data-fb-view]').forEach((v) => { v.hidden = v.dataset.fbView !== name; });
  if (name === 'mine') markSeen();
}

function openDock(tab = 'form') {
  const drawer = $('#fb-drawer');
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  $('#fb-open').setAttribute('aria-expanded', 'true');
  document.body.classList.add('has-drawer');

  setTab(tab);
  if (tab === 'form' && !editingId) $('#fb-title').focus();
  loadTickets();
}

function closeDock() {
  const drawer = $('#fb-drawer');
  drawer.classList.remove('is-open');
  $('#fb-open').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('has-drawer');
  window.setTimeout(() => { drawer.hidden = true; }, 260);
}

const isOpen = () => !$('#fb-drawer').hidden;

// ----------------------------------------------------------------- Formular --

function hint(message, type = 'info') {
  const el = $('#fb-hint');
  el.textContent = message ?? '';
  el.className = `form-hint form-hint--${type}`;
}

function resetForm() {
  editingId = null;
  $('#fb-form').reset();
  $('#fb-page').value = currentPageKey();
  $('#fb-submit').textContent = 'Absenden';
  $('#fb-cancel').hidden = true;
  $('#fb-heading').textContent = 'Feedback';
  hint('');
}

function startEdit(id) {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return;

  editingId = id;
  dock.querySelector(`input[name="fb-kind"][value="${ticket.kind}"]`).checked = true;
  $('#fb-title').value = ticket.title;
  $('#fb-page').value = ticket.page ?? '';
  $('#fb-description').value = ticket.description;
  $('#fb-submit').textContent = 'Änderungen speichern';
  $('#fb-cancel').hidden = false;
  $('#fb-heading').textContent = 'Ticket bearbeiten';
  hint('');
  setTab('form');
  $('#fb-title').focus();
}

async function submitTicket(event) {
  event.preventDefault();

  const title = $('#fb-title').value.trim();
  const description = $('#fb-description').value.trim();
  if (title.length < 3) return hint('Der Titel braucht mindestens 3 Zeichen.', 'error');
  if (description.length < 5) return hint('Bitte die Beschreibung ausfüllen.', 'error');

  const payload = {
    kind: dock.querySelector('input[name="fb-kind"]:checked').value,
    title,
    description,
    page: $('#fb-page').value || null,
  };

  const button = $('#fb-submit');
  button.disabled = true;

  const { error } = editingId
    ? await supabase.from('tickets').update(payload).eq('id', editingId)
    : await supabase.from('tickets').insert({ ...payload, user_id: currentUser.id, status: 'new' });

  button.disabled = false;
  if (error) return hint(`Speichern fehlgeschlagen: ${error.message}`, 'error');

  const wasEdit = Boolean(editingId);
  resetForm();
  await loadTickets();
  markSeen();
  toast(wasEdit ? 'Ticket aktualisiert.' : 'Ticket eingereicht – danke!', 'success');
  setTab('mine');
}

async function deleteTicket(id) {
  if (!window.confirm('Dieses Ticket wirklich löschen?')) return;

  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) return toast(`Löschen fehlgeschlagen: ${error.message}`, 'error');

  if (editingId === id) resetForm();
  toast('Ticket gelöscht.');
  await loadTickets();
  markSeen();
}

/*
  Schließen ist der Schlussstrich des Melders: das Ticket bleibt als Beleg
  stehen, lässt sich aber weder bearbeiten noch wieder öffnen.
*/
async function closeTicket(id) {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return;

  const confirmed = window.confirm(
    `„${ticket.title}“ endgültig schließen?\n\n`
    + 'Das Ticket bleibt sichtbar, kann danach aber nicht mehr bearbeitet oder wieder geöffnet werden.',
  );
  if (!confirmed) return;

  const { error } = await supabase.from('tickets').update({ status: 'closed' }).eq('id', id);
  if (error) {
    // Solange supabase/schema.sql nicht eingespielt ist, kennt die Tabelle den
    // Status "closed" noch nicht – die Rohmeldung hilft da wenig weiter.
    const hint = /constraint|policy|violates/i.test(error.message)
      ? 'Schließen fehlgeschlagen – der Datenbank fehlt noch das Update aus supabase/schema.sql.'
      : `Schließen fehlgeschlagen: ${error.message}`;
    return toast(hint, 'error');
  }

  if (editingId === id) resetForm();
  toast('Ticket geschlossen.', 'success');
  await loadTickets();
  markSeen();
}

// ------------------------------------------------------------------ Rendern --

function metaLine(ticket) {
  const parts = [fmtDate(ticket.created_at)];
  const page = pageLabel(ticket.page);
  if (page) parts.push(page);
  return parts.join(' · ');
}

function actionsHtml(t) {
  if (isClosed(t)) return '';

  const buttons = [
    t.status === 'new' ? `<button type="button" class="btn btn--ghost btn--sm" data-fb-edit="${t.id}">Bearbeiten</button>` : '',
    t.status === 'new' ? `<button type="button" class="btn btn--ghost btn--sm" data-fb-delete="${t.id}">Löschen</button>` : '',
    `<button type="button" class="btn btn--ghost btn--sm btn--close" data-fb-close-ticket="${t.id}">Schließen</button>`,
  ].join('');

  return `<div class="ticket__actions">${buttons}</div>`;
}

function renderList() {
  const list = $('#fb-list');
  const open = tickets.filter((t) => !isClosed(t));
  $('#fb-count').textContent = String(open.length);

  if (!tickets.length) {
    list.innerHTML = '<p class="empty">Noch kein Ticket eingereicht. Über den Tab „Melden“ geht es los.</p>';
    return;
  }

  const seen = readSeen();
  // Geschlossenes ans Ende, sonst bleibt es bei "neueste zuerst".
  const rows = [...open, ...tickets.filter(isClosed)];

  list.innerHTML = rows.map((t) => `
    <article class="ticket${isClosed(t) ? ' ticket--closed' : ''}${isAnswered(t) && seen[t.id] !== t.updated_at ? ' ticket--fresh' : ''}">
      <header class="ticket__head">
        ${kindBadge(t.kind)}
        <span class="ticket__title">${escapeHtml(t.title)}</span>
        ${statusBadge(t.status)}
      </header>
      <p class="ticket__meta">${escapeHtml(metaLine(t))}</p>
      <p class="ticket__text">${escapeHtml(t.description)}</p>
      ${t.owner_note ? `<p class="ticket__note"><strong>Antwort:</strong> ${escapeHtml(t.owner_note)}</p>` : ''}
      ${actionsHtml(t)}
    </article>`).join('');

  list.querySelectorAll('[data-fb-edit]')
    .forEach((b) => b.addEventListener('click', () => startEdit(b.dataset.fbEdit)));
  list.querySelectorAll('[data-fb-delete]')
    .forEach((b) => b.addEventListener('click', () => deleteTicket(b.dataset.fbDelete)));
  list.querySelectorAll('[data-fb-close-ticket]')
    .forEach((b) => b.addEventListener('click', () => closeTicket(b.dataset.fbCloseTicket)));
}

// -------------------------------------------------------------------- Daten --

async function loadTickets() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from('tickets')
    .select('id, kind, title, description, page, status, owner_note, created_at, updated_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (isOpen()) toast(`Tickets konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  tickets = data ?? [];
  loaded = true;
  renderList();
  renderBadge();
}

// --------------------------------------------------------------- Aufbau/Abbau --

function fillPageOptions() {
  const select = $('#fb-page');
  const entries = Object.entries(PAGE_LABELS).filter(([key]) => key !== 'tickets');

  select.innerHTML = `<option value="">Keine Angabe</option>${
    entries.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('')}`;
  select.value = currentPageKey();
}

function build() {
  dock = document.createElement('div');
  dock.className = 'feedback-dock';
  dock.innerHTML = MARKUP;
  document.body.appendChild(dock);

  fillPageOptions();

  $('#fb-open').addEventListener('click', () => (isOpen() ? closeDock() : openDock(loaded && tickets.length && unseenTickets().length ? 'mine' : 'form')));
  dock.querySelectorAll('[data-fb-close]').forEach((el) => el.addEventListener('click', closeDock));
  dock.querySelectorAll('[data-fb-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.fbTab)));
  $('#fb-form').addEventListener('submit', submitTicket);
  $('#fb-cancel').addEventListener('click', resetForm);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dock && isOpen()) closeDock();
  });
}

/** Blendet das Dock nach dem Login ein und lädt den eigenen Bestand. */
export function mountFeedback(user) {
  if (document.body.dataset.feedback === 'off') return;

  currentUser = user;
  if (!dock) build();
  dock.hidden = false;
  loadTickets();
}

/** Beim Abmelden verschwindet das Dock samt Daten. */
export function unmountFeedback() {
  currentUser = null;
  tickets = [];
  loaded = false;
  if (!dock) return;

  if (isOpen()) closeDock();
  dock.hidden = true;
}
