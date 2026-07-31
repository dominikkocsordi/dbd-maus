/*
  Ticket-Cockpit – exklusiv für die Besitzerrolle. Alle Meldungen liegen als
  Board vor: eine Spalte je Status, Karten lassen sich per Drag & Drop
  weiterschieben, ein Klick öffnet die Detailansicht mit Antwortfeld.
*/
import { supabase } from './supabase.js?v=33';
import { initAuth } from './auth.js?v=33';
import { isOwner, loadProfile } from './profile.js?v=33';
import { escapeHtml, fmtDate, fmtDay, fmtNumber, toast } from './utils.js?v=33';
import {
  KIND_GLYPHS, OPEN_STATUS, PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER,
  isClosed, kindBadge, pageLabel, statusBadge,
} from './tickets-shared.js?v=33';
import { createSorter } from './table-sort.js?v=33';

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

let tickets = [];
let emailByUser = new Map();
let detailId = null;

const $ = (sel) => document.querySelector(sel);
const emailOf = (t) => emailByUser.get(t.user_id) ?? 'unbekannt';

// ------------------------------------------------------------------ Filter --

function filtered() {
  const kind = $('#f-kind').value;
  const priority = $('#f-priority').value;
  const term = $('#f-search').value.trim().toLowerCase();

  return tickets.filter((t) => {
    if (kind !== 'all' && t.kind !== kind) return false;
    if (priority !== 'all' && t.priority !== priority) return false;

    if (term) {
      const haystack = [t.title, t.description, t.owner_note ?? '', emailOf(t)].join(' ').toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

const sortForBoard = (rows) => [...rows].sort((a, b) =>
  (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
  || new Date(b.created_at) - new Date(a.created_at));

// ------------------------------------------------------------------- KPIs --

/** Durchschnittliche Bearbeitungsdauer der abgeschlossenen Tickets in Tagen. */
function averageDays() {
  const closed = tickets.filter((t) => t.resolved_at);
  if (!closed.length) return null;

  const total = closed.reduce((sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)), 0);
  return total / closed.length / 86400000;
}

function renderKpis() {
  const open = tickets.filter((t) => OPEN_STATUS.includes(t.status));
  const fresh = tickets.filter((t) => t.status === 'new');
  const done = tickets.filter((t) => t.status === 'done');
  const people = new Set(tickets.map((t) => t.user_id));

  $('#kpi-open').textContent = fmtNumber(open.length);
  $('#kpi-open-hint').textContent = open.length
    ? `${fmtNumber(open.filter((t) => t.kind === 'bug').length)} Bugs · ${fmtNumber(open.filter((t) => t.kind === 'feature').length)} Wünsche`
    : 'Alles abgearbeitet';

  const oldest = fresh.reduce((acc, t) => (!acc || new Date(t.created_at) < new Date(acc.created_at) ? t : acc), null);
  $('#kpi-new').textContent = fmtNumber(fresh.length);
  $('#kpi-new-hint').textContent = oldest ? `Ältestes vom ${fmtDay(oldest.created_at)}` : 'Nichts Unbearbeitetes';

  const days = averageDays();
  const closed = tickets.filter(isClosed).length;
  const duration = days === null
    ? 'Noch nichts abgeschlossen'
    : `Ø ${days < 1 ? 'unter einem Tag' : `${Math.round(days)} Tage`} bis zum Abschluss`;

  $('#kpi-done').textContent = fmtNumber(done.length);
  $('#kpi-done-hint').textContent = closed
    ? `${duration} · ${fmtNumber(closed)}× vom Melder geschlossen`
    : duration;

  $('#kpi-people').textContent = fmtNumber(people.size);
  $('#kpi-people-hint').textContent = `${fmtNumber(tickets.length)} Tickets insgesamt`;

  $('#cockpit-meta').textContent = tickets.length
    ? `Letzte Meldung ${fmtDate(tickets[0].created_at)}`
    : 'Noch keine Meldungen';
}

// ------------------------------------------------------------------ Board --

function cardMarkup(t) {
  const foot = [
    pageLabel(t.page) ? `<span class="tcard__tag">${escapeHtml(pageLabel(t.page))}</span>` : '',
    t.priority !== 'normal'
      ? `<span class="prio prio--${t.priority}">${escapeHtml(PRIORITY_LABELS[t.priority])}</span>` : '',
    t.owner_note ? '<span class="tcard__flag" title="Antwort hinterlegt">&#9993;</span>' : '',
  ].join('');

  return `
    <button type="button" class="tcard tcard--${t.kind}" draggable="true" data-id="${t.id}">
      <span class="tcard__top">
        <span class="tcard__kind" aria-hidden="true">${KIND_GLYPHS[t.kind] ?? ''}</span>
        <span class="tcard__title">${escapeHtml(t.title)}</span>
      </span>
      <span class="tcard__meta">${escapeHtml(emailOf(t))} · ${escapeHtml(fmtDay(t.created_at))}</span>
      ${foot ? `<span class="tcard__foot">${foot}</span>` : ''}
    </button>`;
}

function renderBoard() {
  const board = $('#board');
  const rows = sortForBoard(filtered());

  board.innerHTML = STATUS_ORDER.map((status) => {
    const cards = rows.filter((t) => t.status === status);
    // In "Geschlossen" landet ein Ticket nur durch den Melder selbst.
    const readonly = status === 'closed';
    const empty = readonly ? 'Nichts geschlossen' : 'Karten hierher ziehen';

    return `
      <section class="board__col board__col--${status}${readonly ? ' board__col--readonly' : ''}"
               ${readonly ? '' : `data-status="${status}"`}>
        <header class="board__head">
          <span class="board__dot" aria-hidden="true"></span>
          <h2 class="board__title">${escapeHtml(STATUS_LABELS[status])}</h2>
          <span class="board__count">${fmtNumber(cards.length)}</span>
        </header>
        <div class="board__cards">
          ${cards.length ? cards.map(cardMarkup).join('') : `<p class="board__empty">${empty}</p>`}
        </div>
      </section>`;
  }).join('');

  board.querySelectorAll('.tcard').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', card.dataset.id);
      event.dataTransfer.effectAllowed = 'move';
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
  });

  board.querySelectorAll('.board__col[data-status]').forEach((col) => {
    col.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      col.classList.add('is-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('is-over'));
    col.addEventListener('drop', (event) => {
      event.preventDefault();
      col.classList.remove('is-over');
      moveTicket(event.dataTransfer.getData('text/plain'), col.dataset.status);
    });
  });
}

// ------------------------------------------------------------------ Liste --

/* Sortierung der Listenansicht; Gleichstände behalten die Board-Reihenfolge. */
const LIST_VALUES = {
  title: (t) => t.title ?? '',
  reporter: (t) => emailOf(t),
  priority: (t) => PRIORITY_RANK[t.priority] ?? 1,
  status: (t) => STATUS_ORDER.indexOf(t.status),
  created: (t) => new Date(t.created_at ?? 0).getTime(),
};

const listSorter = createSorter({
  table: '#list-table',
  values: LIST_VALUES,
  initial: 'priority',
  dir: 'asc',
  onChange: () => renderList(),
});

function renderList() {
  const rows = listSorter.apply(sortForBoard(filtered()));
  $('#list-count').textContent = `${fmtNumber(rows.length)} von ${fmtNumber(tickets.length)}`;

  const body = $('#list-body');
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Kein Ticket passt zu diesem Filter.</td></tr>';
    return;
  }

  body.innerHTML = rows.map((t) => `
    <tr data-id="${t.id}">
      <td data-label="Ticket">
        <span class="list-title">${KIND_GLYPHS[t.kind] ?? ''} ${escapeHtml(t.title)}</span>
      </td>
      <td data-label="Melder">${escapeHtml(emailOf(t))}</td>
      <td data-label="Priorität"><span class="prio prio--${t.priority}">${escapeHtml(PRIORITY_LABELS[t.priority])}</span></td>
      <td data-label="Status">${statusBadge(t.status)}</td>
      <td data-label="Gemeldet">${escapeHtml(fmtDay(t.created_at))}</td>
    </tr>`).join('');

  body.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', () => openDetail(row.dataset.id));
  });
}

function render() {
  const list = $('#f-view').value === 'list';
  $('#board').hidden = list;
  $('#list-view').hidden = !list;

  renderKpis();
  if (list) renderList(); else renderBoard();
}

// ------------------------------------------------------------- Detailpanel --

const options = (map, selected) => Object.entries(map)
  .map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`)
  .join('');

/*
  "Geschlossen" setzt der Melder selbst – im Cockpit steht es nur dann zur
  Wahl, wenn das Ticket schon so dasteht (dann aber auch umkehrbar).
*/
function statusChoices(current) {
  if (current === 'closed') return STATUS_LABELS;
  const { closed: _closed, ...rest } = STATUS_LABELS;
  return rest;
}

function openDetail(id) {
  const t = tickets.find((x) => x.id === id);
  if (!t) return;

  detailId = id;
  $('#detail-title').textContent = t.title;
  $('#detail-badges').innerHTML = `${kindBadge(t.kind)}${statusBadge(t.status)}`;
  $('#detail-meta').textContent = [
    emailOf(t),
    `gemeldet ${fmtDate(t.created_at)}`,
    pageLabel(t.page) ? `Seite: ${pageLabel(t.page)}` : null,
    t.resolved_at ? `abgeschlossen ${fmtDate(t.resolved_at)}` : null,
  ].filter(Boolean).join(' · ');
  $('#detail-text').textContent = t.description;
  $('#detail-status').innerHTML = options(statusChoices(t.status), t.status);
  $('#detail-priority').innerHTML = options(PRIORITY_LABELS, t.priority);
  $('#detail-note').value = t.owner_note ?? '';
  detailHint('');

  const drawer = $('#detail');
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  document.body.classList.add('has-drawer');
}

function closeDetail() {
  const drawer = $('#detail');
  detailId = null;
  drawer.classList.remove('is-open');
  document.body.classList.remove('has-drawer');
  window.setTimeout(() => { drawer.hidden = true; }, 260);
}

function detailHint(message, type = 'info') {
  const el = $('#detail-hint');
  el.textContent = message ?? '';
  el.className = `form-hint form-hint--${type}`;
}

async function saveDetail() {
  if (!detailId) return;

  const button = $('#detail-save');
  button.disabled = true;
  const error = await patch(detailId, {
    status: $('#detail-status').value,
    priority: $('#detail-priority').value,
    owner_note: $('#detail-note').value.trim() || null,
  });
  button.disabled = false;

  if (error) return detailHint(error.message, 'error');

  toast('Ticket aktualisiert.', 'success');
  closeDetail();
}

async function removeDetail() {
  if (!detailId || !window.confirm('Dieses Ticket wirklich löschen?')) return;

  const { error } = await supabase.from('tickets').delete().eq('id', detailId);
  if (error) return detailHint(error.message, 'error');

  toast('Ticket gelöscht.');
  closeDetail();
  await loadTickets();
}

// ------------------------------------------------------------------ Daten --

/** Schreibt Änderungen und hält die lokale Liste im Gleichklang. */
async function patch(id, fields) {
  const { data, error } = await supabase.from('tickets').update(fields).eq('id', id)
    .select('id, user_id, kind, title, description, page, status, priority, owner_note, created_at, updated_at, resolved_at')
    .maybeSingle();

  if (error) return error;

  if (data) tickets = tickets.map((t) => (t.id === id ? data : t));
  render();
  return null;
}

async function moveTicket(id, status) {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket || ticket.status === status) return;

  const error = await patch(id, { status });
  if (error) return toast(`Verschieben fehlgeschlagen: ${error.message}`, 'error');
  toast(`„${ticket.title}“ → ${STATUS_LABELS[status]}`, 'success');
}

async function loadTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, user_id, kind, title, description, page, status, priority, owner_note, created_at, updated_at, resolved_at')
    .order('created_at', { ascending: false });

  if (error) {
    toast(`Tickets konnten nicht geladen werden: ${error.message}`, 'error');
    return;
  }

  tickets = data ?? [];
  await loadReporterEmails();
  render();
}

async function loadReporterEmails() {
  const ids = [...new Set(tickets.map((t) => t.user_id))];
  if (!ids.length) return;

  const { data } = await supabase.from('profiles').select('user_id, email').in('user_id', ids);
  emailByUser = new Map((data ?? []).map((p) => [p.user_id, p.email]));
}

// ------------------------------------------------------------------- Init --

['f-kind', 'f-priority', 'f-search', 'f-view'].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener('change', render);
  el.addEventListener('input', render);
});

$('#reload').addEventListener('click', loadTickets);
$('#detail-save').addEventListener('click', saveDetail);
$('#detail-delete').addEventListener('click', removeDetail);
document.querySelectorAll('[data-detail-close]').forEach((el) => el.addEventListener('click', closeDetail));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#detail').hidden) closeDetail();
});

initAuth({
  onLogin: async (user) => {
    await loadProfile(user);

    $('#locked-panel').hidden = isOwner();
    $('#cockpit').hidden = !isOwner();
    if (!isOwner()) return;

    await loadTickets();
  },
  onLogout: () => {
    tickets = [];
    emailByUser = new Map();
    if (!$('#detail').hidden) closeDetail();
  },
});
