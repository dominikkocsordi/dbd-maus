/*
  Freunde: über den achtstelligen Code hinzufügen und Kennzahlen vergleichen.
  Geteilt werden nur die Summen aus friend_stats() – einzelne Matches, Notizen
  und Builds bleiben privat.
*/
import { supabase } from './supabase.js?v=55';
import { initAuth } from './auth.js?v=55';
import { escapeHtml, fmtDate, fmtNumber, fmtPercent, toast } from './utils.js?v=55';
import { createSorter } from './table-sort.js?v=55';
import { crestHtml } from './crest.js?v=55';

/** Womit sich vergleichen lässt; `value` liefert die Zahl, `format` den Text. */
const METRICS = [
  { key: 'matches', label: 'Matches', value: (r) => r.matches_total, format: fmtNumber },
  {
    key: 'killrate',
    label: 'Kill-Rate',
    value: (r) => (r.kill_slots ? (r.kills_total / r.kill_slots) * 100 : null),
    format: (v) => fmtPercent(v),
  },
  {
    key: 'escaperate',
    label: 'Escape-Rate',
    value: (r) => (r.survivor_total ? (r.escapes_total / r.survivor_total) * 100 : null),
    format: (v) => fmtPercent(v),
  },
  { key: 'kills', label: 'Kills', value: (r) => r.kills_total, format: fmtNumber },
  { key: 'escapes', label: 'Escapes', value: (r) => r.escapes_total, format: fmtNumber },
  { key: 'merciless', label: 'Matches mit allen Kills', value: (r) => r.merciless_total, format: fmtNumber },
  { key: 'bp', label: 'Blutpunkte', value: (r) => r.bloodpoints_total, format: fmtNumber },
  {
    key: 'bpavg',
    label: 'Ø Blutpunkte',
    value: (r) => (r.matches_total ? r.bloodpoints_total / r.matches_total : null),
    format: fmtNumber,
  },
  { key: 'prestige', label: 'Prestige gesamt', value: (r) => r.prestige_total ?? null, format: fmtNumber },
  { key: 'prestigemax', label: 'Höchste Prestige-Stufe', value: (r) => r.prestige_max ?? null, format: fmtNumber },
  { key: 'prestigemaxed', label: 'Charaktere auf Prestige 100', value: (r) => r.prestige_maxed ?? null, format: fmtNumber },
];

const ADD_MESSAGES = {
  requested: ['Anfrage ist raus – jetzt muss die andere Seite zustimmen.', 'success'],
  accepted: ['Ihr seid jetzt befreundet – die Anfrage lag schon vor.', 'success'],
  pending: ['Deine Anfrage läuft schon, bitte um Geduld.', 'info'],
  already: ['Ihr seid bereits befreundet.', 'info'],
  self: ['Das ist dein eigener Code.', 'error'],
  unknown: ['Zu diesem Code gehört niemand.', 'error'],
  unauthorized: ['Bitte neu anmelden.', 'error'],
};

let currentUser = null;
let rows = [];
let requests = [];

const $ = (sel) => document.querySelector(sel);

/** Anzeigename, sonst der Teil vor dem @, sonst "Unbekannt". */
function personName(row) {
  if (row.person_name) return row.person_name;
  const local = (row.person_email ?? '').split('@')[0];
  return local || 'Unbekannt';
}

const prettyCode = (code) => (code ? `${code.slice(0, 4)} ${code.slice(4)}` : '– –');

// ------------------------------------------------------------------ Eigenes --

function renderSelf() {
  const me = rows.find((r) => r.is_self);
  $('#my-code').textContent = prettyCode(me?.person_code);
  $('#copy-code').disabled = !me?.person_code;

  const input = $('#display-name');
  if (document.activeElement !== input) input.value = me?.person_name ?? '';
}

async function saveDisplayName() {
  const value = $('#display-name').value.trim();
  const hint = $('#name-hint');

  if (value && (value.length < 2 || value.length > 24)) {
    hint.textContent = 'Zwei bis 24 Zeichen, bitte.';
    hint.className = 'form-hint form-hint--error';
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: value || null })
    .eq('user_id', currentUser.id);

  if (error) {
    hint.textContent = error.message;
    hint.className = 'form-hint form-hint--error';
    return;
  }

  hint.textContent = 'Gespeichert.';
  hint.className = 'form-hint form-hint--success';
  await loadAll();
}

async function copyCode() {
  const me = rows.find((r) => r.is_self);
  if (!me?.person_code) return;

  try {
    await navigator.clipboard.writeText(me.person_code);
    toast('Code kopiert.', 'success');
  } catch {
    // Ohne Zwischenablage-Recht bleibt das Markieren von Hand.
    toast('Kopieren nicht erlaubt – Code bitte von Hand übernehmen.', 'error');
  }
}

// ----------------------------------------------------------------- Anfragen --

async function addFriend(event) {
  event.preventDefault();

  const input = $('#friend-code');
  const hint = $('#add-hint');
  const button = $('#add-submit');

  button.disabled = true;
  const { data, error } = await supabase.rpc('add_friend', { code: input.value });
  button.disabled = false;

  if (error) {
    hint.textContent = /function/i.test(error.message)
      ? 'Der Datenbank fehlt noch das Update aus supabase/schema.sql.'
      : error.message;
    hint.className = 'form-hint form-hint--error';
    return;
  }

  const [message, type] = ADD_MESSAGES[data] ?? ['Unerwartete Antwort.', 'error'];
  hint.textContent = message;
  hint.className = `form-hint form-hint--${type}`;
  if (type === 'success') input.value = '';

  await loadAll();
}

async function answerRequest(id, accept) {
  const query = accept
    ? supabase.from('friendships').update({ status: 'accepted' }).eq('id', id)
    : supabase.from('friendships').delete().eq('id', id);

  const { error } = await query;
  if (error) return toast(error.message, 'error');

  toast(accept ? 'Freundschaft steht.' : 'Anfrage entfernt.');
  await loadAll();
}

async function removeFriend(id, name) {
  if (!window.confirm(`${name} wirklich aus der Freundesliste entfernen?`)) return;

  const { error } = await supabase.from('friendships').delete().eq('id', id);
  if (error) return toast(error.message, 'error');

  toast('Freund entfernt.');
  await loadAll();
}

function renderRequests() {
  const panel = $('#request-panel');
  panel.hidden = requests.length === 0;
  if (!requests.length) return;

  const incoming = requests.filter((r) => r.direction === 'in').length;
  $('#request-count').textContent = incoming ? `${fmtNumber(incoming)} offen` : 'gesendet';

  $('#request-list').innerHTML = requests.map((r) => {
    const name = r.other_name || (r.other_email ?? '').split('@')[0] || 'Unbekannt';
    const inbound = r.direction === 'in';

    return `
      <article class="friend-row">
        <span class="friend-row__text">
          <span class="friend-row__name">${escapeHtml(name)}</span>
          <span class="friend-row__meta">${inbound ? 'möchte dich hinzufügen' : 'Anfrage gesendet'} · ${escapeHtml(fmtDate(r.asked_at))}</span>
        </span>
        <span class="friend-row__actions">
          ${inbound ? `<button type="button" class="btn btn--primary btn--sm" data-accept="${r.request_id}">Annehmen</button>` : ''}
          <button type="button" class="btn btn--ghost btn--sm" data-drop="${r.request_id}">${inbound ? 'Ablehnen' : 'Zurückziehen'}</button>
        </span>
      </article>`;
  }).join('');

  $('#request-list').querySelectorAll('[data-accept]')
    .forEach((b) => b.addEventListener('click', () => answerRequest(b.dataset.accept, true)));
  $('#request-list').querySelectorAll('[data-drop]')
    .forEach((b) => b.addEventListener('click', () => answerRequest(b.dataset.drop, false)));
}

// ---------------------------------------------------------------- Vergleich --

function renderBars() {
  const metric = METRICS.find((m) => m.key === $('#metric').value) ?? METRICS[0];
  const container = $('#compare-bars');
  const empty = $('#compare-empty');

  empty.hidden = rows.length > 1;
  if (rows.length < 2) {
    container.innerHTML = '';
    return;
  }

  const scored = rows
    .map((r) => ({ row: r, value: metric.value(r) }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));

  const max = Math.max(1, ...scored.map((s) => s.value ?? 0));

  // Bei der höchsten Stufe steht das Wappen mit im Balken.
  const withCrest = metric.key === 'prestigemax';

  container.innerHTML = scored.map(({ row, value }) => `
    <div class="bar">
      <span class="bar__label${row.is_self ? ' bar__label--self' : ''}">${escapeHtml(personName(row))}</span>
      <span class="bar__track">
        <span class="bar__fill ${row.is_self ? 'bar__fill--survivor' : 'bar__fill--killer'}"
              style="width:${((value ?? 0) / max) * 100}%"></span>
      </span>
      <span class="bar__value">${withCrest
        ? `${crestHtml(value ?? 0, 'crest--sm')}<span class="sr-only">${value === null ? '–' : metric.format(value)}</span>`
        : (value === null ? '–' : metric.format(value))}</span>
    </div>`).join('');
}

/* Wonach sich die Vergleichstabelle sortieren lässt. */
const COMPARE_VALUES = {
  name: (r) => personName(r),
  last: (r) => (r.last_played ? new Date(r.last_played).getTime() : null),
  ...Object.fromEntries(METRICS.map((m) => [m.key, m.value])),
};

const compareSorter = createSorter({
  table: '#compare-table',
  values: COMPARE_VALUES,
  initial: 'matches',
  onChange: () => renderTable(),
});

function renderTable() {
  const panel = $('#table-panel');
  panel.hidden = rows.length < 2;
  if (rows.length < 2) return;

  $('#table-meta').textContent = `${fmtNumber(rows.length - 1)} ${rows.length === 2 ? 'Freund' : 'Freunde'}`;

  // Bestwert je Kennzahl, damit die Spitze hervorgehoben werden kann.
  const best = new Map(METRICS.map((m) => {
    const values = rows.map((r) => m.value(r)).filter((v) => v !== null && v > 0);
    return [m.key, values.length ? Math.max(...values) : null];
  }));

  const cell = (metric, row) => {
    const value = metric.value(row);
    const leads = value !== null && value === best.get(metric.key);
    return `<td data-label="${escapeHtml(metric.label)}" class="num${leads ? ' is-best' : ''}">`
      + `${value === null ? '–' : metric.format(value)}</td>`;
  };

  // Die höchste Stufe zeigt ihr Wappen – eine Zahl allein sagt wenig.
  const topLevel = METRICS.find((m) => m.key === 'prestigemax');
  const bestLevel = best.get('prestigemax');
  const crestCell = (row) => {
    const value = topLevel.value(row);
    const leads = value !== null && value > 0 && value === bestLevel;
    // Die Zahl steht schon im Wappen – daneben nur noch für Vorleseprogramme.
    return `<td data-label="Höchste Stufe" class="num${leads ? ' is-best' : ''}">`
      + `<span class="crest-cell">${crestHtml(value ?? 0, 'crest--sm')}`
      + `<span class="sr-only">${value === null ? 'keine Angabe' : `Prestige ${fmtNumber(value)}`}</span></span></td>`;
  };

  const order = ['matches', 'killrate', 'escaperate', 'kills', 'escapes', 'merciless', 'bp', 'bpavg', 'prestige', 'prestigemaxed']
    .map((key) => METRICS.find((m) => m.key === key));

  $('#compare-body').innerHTML = compareSorter.apply(rows)
    .map((row) => `
      <tr${row.is_self ? ' class="is-self"' : ''}>
        <td data-label="Wer">
          <span class="friend-cell">
            <span class="friend-cell__name">${escapeHtml(personName(row))}</span>
            ${row.is_self ? '<span class="friend-cell__tag">du</span>' : ''}
          </span>
        </td>
        ${order.map((m) => cell(m, row)).join('')}
        ${crestCell(row)}
        <td data-label="Zuletzt">${escapeHtml(row.last_played ? fmtDate(row.last_played) : '–')}</td>
        <td data-label="Aktion" class="num">
          ${row.link_id ? `<span class="row-actions">
            <button type="button" class="icon-btn icon-btn--danger" data-remove="${row.link_id}"
                    data-name="${escapeHtml(personName(row))}"
                    title="Freund entfernen" aria-label="${escapeHtml(personName(row))} entfernen">&#10005;</button>
          </span>` : ''}
        </td>
      </tr>`).join('');

  $('#compare-body').querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removeFriend(btn.dataset.remove, btn.dataset.name));
  });
}

// -------------------------------------------------------------------- Daten --

async function loadAll() {
  const [stats, pending] = await Promise.all([
    supabase.rpc('friend_stats'),
    supabase.rpc('friend_requests'),
  ]);

  if (stats.error) {
    const missing = /function|schema cache/i.test(stats.error.message);
    toast(missing
      ? 'Der Datenbank fehlt noch das Update aus supabase/schema.sql.'
      : `Freunde konnten nicht geladen werden: ${stats.error.message}`, 'error');
    return;
  }

  rows = stats.data ?? [];
  requests = pending.error ? [] : (pending.data ?? []);

  const friends = rows.length - 1;
  $('#friends-meta').textContent = friends > 0
    ? `${fmtNumber(friends)} ${friends === 1 ? 'Freund' : 'Freunde'} im Vergleich`
    : 'Noch niemand dabei';

  renderSelf();
  renderRequests();
  renderBars();
  renderTable();
}

// --------------------------------------------------------------------- Init --

$('#metric').innerHTML = METRICS
  .map((m) => `<option value="${m.key}">${escapeHtml(m.label)}</option>`).join('');
$('#metric').addEventListener('change', renderBars);
$('#add-form').addEventListener('submit', addFriend);
$('#copy-code').addEventListener('click', copyCode);
$('#save-name').addEventListener('click', saveDisplayName);

initAuth({
  onLogin: async (user) => {
    currentUser = user;
    await loadAll();
  },
  onLogout: () => {
    currentUser = null;
    rows = [];
    requests = [];
  },
});
