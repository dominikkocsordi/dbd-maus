import { supabase } from './supabase.js?v=17';
import { initAuth } from './auth.js?v=17';
import { isOwner, loadProfile, roleLabel } from './profile.js?v=17';
import { escapeHtml, fmtDate, fmtNumber, toast } from './utils.js?v=17';

export const KIND_LABELS = { bug: 'Bug', feature: 'Wunsch' };
export const STATUS_LABELS = {
  new: 'Neu',
  in_progress: 'In Arbeit',
  planned: 'Geplant',
  done: 'Erledigt',
  rejected: 'Abgelehnt',
};
const PRIORITY_LABELS = { low: 'Niedrig', normal: 'Normal', high: 'Hoch' };
const PAGE_LABELS = {
  index: 'Übersicht',
  stats: 'Statistik',
  perks: 'Perks & Builds',
  challenges: 'Challenges',
  settings: 'Einstellungen',
  tickets: 'Tickets',
  other: 'Sonstiges',
};
const OPEN_STATUS = ['new', 'in_progress', 'planned'];

let currentUser = null;
let myTickets = [];
let allTickets = [];
let emailByUser = new Map();
let editingId = null;

// ----------------------------------------------------------------- Einreichen --

function formHint(message, type = 'info') {
  const el = document.getElementById('ticket-hint');
  el.textContent = message ?? '';
  el.className = `form-hint form-hint--${type}`;
}

function resetForm() {
  editingId = null;
  document.getElementById('ticket-form').reset();
  document.getElementById('ticket-form-title').textContent = 'Neues Ticket';
  document.getElementById('t-submit').textContent = 'Absenden';
  document.getElementById('t-cancel').hidden = true;
  document.getElementById('ticket-panel').classList.remove('panel--editing');
  formHint('');
}

function startEdit(id) {
  const ticket = myTickets.find((t) => t.id === id);
  if (!ticket) return;

  editingId = id;
  document.querySelector(`input[name="kind"][value="${ticket.kind}"]`).checked = true;
  document.getElementById('t-title').value = ticket.title;
  document.getElementById('t-page').value = ticket.page ?? '';
  document.getElementById('t-description').value = ticket.description;
  document.getElementById('ticket-form-title').textContent = 'Ticket bearbeiten';
  document.getElementById('t-submit').textContent = 'Änderungen speichern';
  document.getElementById('t-cancel').hidden = false;
  document.getElementById('ticket-panel').classList.add('panel--editing');
  formHint('');
  document.getElementById('ticket-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitTicket(event) {
  event.preventDefault();

  const title = document.getElementById('t-title').value.trim();
  const description = document.getElementById('t-description').value.trim();
  if (title.length < 3) return formHint('Der Titel braucht mindestens 3 Zeichen.', 'error');
  if (description.length < 5) return formHint('Bitte die Beschreibung ausfüllen.', 'error');

  const payload = {
    kind: document.querySelector('input[name="kind"]:checked').value,
    title,
    description,
    page: document.getElementById('t-page').value || null,
  };

  const button = document.getElementById('t-submit');
  button.disabled = true;

  const { error } = editingId
    ? await supabase.from('tickets').update(payload).eq('id', editingId)
    : await supabase.from('tickets').insert({ ...payload, user_id: currentUser.id, status: 'new' });

  button.disabled = false;

  if (error) return formHint(`Speichern fehlgeschlagen: ${error.message}`, 'error');

  toast(editingId ? 'Ticket aktualisiert.' : 'Ticket eingereicht – danke!', 'success');
  resetForm();
  await loadTickets();
}

async function deleteTicket(id) {
  if (!window.confirm('Dieses Ticket wirklich löschen?')) return;

  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) return toast(`Löschen fehlgeschlagen: ${error.message}`, 'error');

  toast('Ticket gelöscht.');
  if (editingId === id) resetForm();
  await loadTickets();
}

// -------------------------------------------------------------------- Render --

const statusBadge = (status) =>
  `<span class="status status--${status}">${escapeHtml(STATUS_LABELS[status] ?? status)}</span>`;

const kindBadge = (kind) =>
  `<span class="kind kind--${kind}">${kind === 'bug' ? '&#128027;' : '&#128161;'} ${escapeHtml(KIND_LABELS[kind] ?? kind)}</span>`;

function metaLine(ticket, withEmail = false) {
  const parts = [fmtDate(ticket.created_at)];
  if (ticket.page) parts.push(PAGE_LABELS[ticket.page] ?? ticket.page);
  if (ticket.priority !== 'normal') parts.push(`Priorität ${PRIORITY_LABELS[ticket.priority]}`);
  if (withEmail) parts.push(emailByUser.get(ticket.user_id) ?? 'unbekannt');
  return parts.join(' · ');
}

function renderMyTickets() {
  const list = document.getElementById('my-tickets');
  document.getElementById('my-count').textContent = myTickets.length ? fmtNumber(myTickets.length) : '';

  if (!myTickets.length) {
    list.innerHTML = '<p class="empty">Noch kein Ticket eingereicht.</p>';
    return;
  }

  list.innerHTML = myTickets.map((t) => `
    <article class="ticket">
      <header class="ticket__head">
        ${kindBadge(t.kind)}
        <span class="ticket__title">${escapeHtml(t.title)}</span>
        ${statusBadge(t.status)}
      </header>
      <p class="ticket__meta">${escapeHtml(metaLine(t))}</p>
      <p class="ticket__text">${escapeHtml(t.description)}</p>
      ${t.owner_note ? `<p class="ticket__note"><strong>Antwort:</strong> ${escapeHtml(t.owner_note)}</p>` : ''}
      ${t.status === 'new' ? `
        <div class="ticket__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-edit="${t.id}">Bearbeiten</button>
          <button type="button" class="btn btn--ghost btn--sm" data-delete="${t.id}">Löschen</button>
        </div>` : ''}
    </article>`).join('');

  list.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => startEdit(b.dataset.edit)));
  list.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deleteTicket(b.dataset.delete)));
}

function filteredOwnerTickets() {
  const status = document.getElementById('fo-status').value;
  const kind = document.getElementById('fo-kind').value;
  const term = document.getElementById('fo-search').value.trim().toLowerCase();

  return allTickets.filter((t) => {
    if (status === 'open' && !OPEN_STATUS.includes(t.status)) return false;
    if (status !== 'open' && status !== 'all' && t.status !== status) return false;
    if (kind !== 'all' && t.kind !== kind) return false;

    if (term) {
      const haystack = [t.title, t.description, emailByUser.get(t.user_id) ?? '']
        .join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

function renderOwnerTickets() {
  const panel = document.getElementById('owner-panel');
  panel.hidden = !isOwner();
  if (!isOwner()) return;

  const rows = filteredOwnerTickets();
  const open = allTickets.filter((t) => OPEN_STATUS.includes(t.status)).length;
  document.getElementById('owner-count').textContent =
    `${fmtNumber(rows.length)} angezeigt · ${fmtNumber(open)} offen`;

  const list = document.getElementById('owner-tickets');
  if (!rows.length) {
    list.innerHTML = '<p class="empty">Kein Ticket passt zu diesem Filter.</p>';
    return;
  }

  const options = (map, selected) => Object.entries(map)
    .map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`)
    .join('');

  list.innerHTML = rows.map((t) => `
    <article class="ticket ticket--managed" data-ticket="${t.id}">
      <header class="ticket__head">
        ${kindBadge(t.kind)}
        <span class="ticket__title">${escapeHtml(t.title)}</span>
        ${statusBadge(t.status)}
      </header>
      <p class="ticket__meta">${escapeHtml(metaLine(t, true))}</p>
      <p class="ticket__text">${escapeHtml(t.description)}</p>

      <div class="ticket__controls">
        <label class="field">
          <span class="field__label">Status</span>
          <select data-status>${options(STATUS_LABELS, t.status)}</select>
        </label>
        <label class="field">
          <span class="field__label">Priorität</span>
          <select data-priority>${options(PRIORITY_LABELS, t.priority)}</select>
        </label>
        <label class="field">
          <span class="field__label">Antwort</span>
          <textarea data-note rows="2" maxlength="2000" placeholder="optional">${escapeHtml(t.owner_note ?? '')}</textarea>
        </label>
      </div>

      <div class="ticket__actions">
        <button type="button" class="btn btn--primary btn--sm" data-save>Speichern</button>
        <button type="button" class="btn btn--ghost btn--sm" data-remove>Löschen</button>
        <span class="form-hint" data-row-hint></span>
      </div>
    </article>`).join('');

  list.querySelectorAll('[data-ticket]').forEach((card) => {
    const id = card.dataset.ticket;
    card.querySelector('[data-save]').addEventListener('click', () => saveOwnerChanges(id, card));
    card.querySelector('[data-remove]').addEventListener('click', () => deleteTicket(id));
  });
}

async function saveOwnerChanges(id, card) {
  const button = card.querySelector('[data-save]');
  const hint = card.querySelector('[data-row-hint]');

  button.disabled = true;
  const { error } = await supabase.from('tickets').update({
    status: card.querySelector('[data-status]').value,
    priority: card.querySelector('[data-priority]').value,
    owner_note: card.querySelector('[data-note]').value.trim() || null,
  }).eq('id', id);
  button.disabled = false;

  if (error) {
    hint.textContent = error.message;
    hint.className = 'form-hint form-hint--error';
    return;
  }

  toast('Ticket aktualisiert.', 'success');
  await loadTickets();
}

// --------------------------------------------------------------------- Daten --

async function loadTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, user_id, kind, title, description, page, status, priority, owner_note, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    toast(`Tickets konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  // Dank RLS enthält die Antwort für die Besitzerrolle alle Tickets, sonst nur eigene.
  allTickets = data ?? [];
  myTickets = allTickets.filter((t) => t.user_id === currentUser.id);

  if (isOwner()) await loadReporterEmails();

  renderMyTickets();
  renderOwnerTickets();
}

async function loadReporterEmails() {
  const ids = [...new Set(allTickets.map((t) => t.user_id))];
  if (!ids.length) return;

  const { data } = await supabase.from('profiles').select('user_id, email').in('user_id', ids);
  emailByUser = new Map((data ?? []).map((p) => [p.user_id, p.email]));
}

// ---------------------------------------------------------------------- Init --

document.getElementById('ticket-form').addEventListener('submit', submitTicket);
document.getElementById('t-cancel').addEventListener('click', resetForm);
['fo-status', 'fo-kind', 'fo-search'].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener('change', renderOwnerTickets);
  el.addEventListener('input', renderOwnerTickets);
});

initAuth({
  onLogin: async (user) => {
    currentUser = user;
    await loadProfile(user);
    document.getElementById('role-meta').textContent = `Rolle: ${roleLabel()}`;
    await loadTickets();
  },
  onLogout: () => {
    currentUser = null;
    myTickets = [];
    allTickets = [];
  },
});
