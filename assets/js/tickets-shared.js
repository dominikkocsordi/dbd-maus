// Gemeinsame Begriffe und Bausteine für Feedback-Dock und Ticket-Cockpit.
import { escapeHtml } from './utils.js?v=60';

export const KIND_LABELS = { bug: 'Bug', feature: 'Wunsch' };
export const KIND_GLYPHS = { bug: '&#128027;', feature: '&#128161;' };

export const STATUS_LABELS = {
  new: 'Neu',
  in_progress: 'In Arbeit',
  planned: 'Geplant',
  done: 'Erledigt',
  rejected: 'Abgelehnt',
  closed: 'Geschlossen',
};

/** Reihenfolge der Spalten im Cockpit-Board. */
export const STATUS_ORDER = ['new', 'in_progress', 'planned', 'done', 'rejected', 'closed'];
export const OPEN_STATUS = ['new', 'in_progress', 'planned'];

/** Vom Melder endgültig geschlossen – danach ist nichts mehr zu tun. */
export const isClosed = (ticket) => ticket.status === 'closed';

export const PRIORITY_LABELS = { low: 'Niedrig', normal: 'Normal', high: 'Hoch' };

export const PAGE_LABELS = {
  index: 'Übersicht',
  stats: 'Statistik',
  prestige: 'Prestige',
  perks: 'Perks & Builds',
  challenges: 'Challenges',
  settings: 'Einstellungen',
  tickets: 'Tickets',        // Altbestand: frühere eigene Ticket-Seite
  other: 'Sonstiges',
};

export const statusBadge = (status) =>
  `<span class="status status--${status}">${escapeHtml(STATUS_LABELS[status] ?? status)}</span>`;

export const kindBadge = (kind) =>
  `<span class="kind kind--${kind}">${KIND_GLYPHS[kind] ?? ''} ${escapeHtml(KIND_LABELS[kind] ?? kind)}</span>`;

export const pageLabel = (page) => (page ? PAGE_LABELS[page] ?? page : null);

/** Auf welcher Seite wir gerade sind – füllt das Feld "Seite" vor. */
export function currentPageKey() {
  const file = (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/, '');
  const key = file || 'index';
  return key in PAGE_LABELS ? key : '';
}
