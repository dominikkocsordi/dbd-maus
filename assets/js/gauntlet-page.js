/*
  Der Tracker zu "The Survivor Gauntlet". Die Regeln stehen in gauntlet.js,
  hier hängt die Oberfläche daran.

  Gespeichert wird der ganze Lauf als eine Zeile (Tabelle `gauntlet_runs`),
  und zwar nach jedem Schritt. Was auf dem Bildschirm steht, wird jedes Mal
  komplett neu gerechnet – aus dem Verlauf, nicht aus mitgeführten Zählern.
  Damit kann keine Anzeige davonlaufen, und ein zurückgenommener Eintrag
  räumt zuverlässig auf.

  Die Seite kommt mit drei Blöcken aus: wo ich stehe (Stufenleiter samt
  Zahlen), was gerade zu tun ist (Am Zug) und wer noch offen ist (das
  Raster). Das Raster ist zugleich die Auswahl – "Auswahl bearbeiten"
  macht aus denselben Kacheln Knöpfe, statt sie ein zweites Mal darunter
  zu stellen.
*/
import { supabase } from './supabase.js?v=70';
import { initAuth } from './auth.js?v=70';
import { initCollapse } from './collapse.js?v=70';
import { labelFor } from './data.js?v=70';
import { avatarHtml, mountIcons, perkIconHtml } from './images.js?v=70';
import { escapeHtml, fmtDate, fmtDay, fmtNumber, fmtPercent, toast } from './utils.js?v=70';
import {
  MIN_POOL,
  ROSTER,
  ROSTER_IDS,
  completedIds,
  drawNext,
  lossOnDeath,
  replay,
  runLength,
  teachablePerks,
  tierAt,
} from './gauntlet.js?v=70';

const $ = (sel) => document.querySelector(sel);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const RESULT_LABELS = {
  escaped: 'Entkommen',
  died: 'Gestorben',
  void: 'Zählt nicht',
};

/* Der Verlauf wächst über einen Lauf auf hunderte Zeilen – so viele will
   niemand durchscrollen. Der Rest steht als Zahl darunter. */
const LOG_LIMIT = 10;

let currentUser = null;
let run = freshRun();  // der laufende Versuch, ggf. noch ohne Zeile in der DB
let past = [];         // abgeschlossene und abgebrochene Läufe
let busy = false;      // während gespeichert wird, keine zweite Aktion
let editing = false;   // Raster als Auswahl statt als Anzeige
let filter = 'all';    // was das Raster zeigt

// --------------------------------------------------------------------- Daten --

/** Frischer Lauf mit allen Survivorn – angelegt wird er erst beim ersten Schritt. */
function freshRun() {
  return {
    id: null,
    status: 'active',
    pool: [...ROSTER_IDS],
    wildcards: false,
    log: [],
    current: null,
    started_at: new Date().toISOString(),
    finished_at: null,
  };
}

function fromDb(row) {
  return {
    id: row.id,
    status: row.status,
    pool: Array.isArray(row.pool) && row.pool.length ? row.pool : [...ROSTER_IDS],
    wildcards: Boolean(row.wildcards),
    log: Array.isArray(row.log) ? row.log : [],
    current: row.current_survivor
      ? { survivor: row.current_survivor, wild: Boolean(row.current_wild) }
      : null,
    started_at: row.started_at,
    finished_at: row.finished_at,
  };
}

function toDb(entry) {
  return {
    status: entry.status,
    pool: entry.pool,
    wildcards: entry.wildcards,
    log: entry.log,
    current_survivor: entry.current?.survivor ?? null,
    current_wild: Boolean(entry.current?.wild),
    started_at: entry.started_at,
    finished_at: entry.finished_at,
  };
}

/** Fehlt das Schema-Update, steht die Seite trotzdem – nur eben ohne Speichern. */
function reportError(error, what) {
  const missing = /gauntlet|schema cache|does not exist/i.test(error.message);
  toast(missing
    ? 'Der Datenbank fehlt noch das Update aus supabase/schema.sql.'
    : `${what}: ${error.message}`, 'error');
}

async function loadRuns() {
  const { data, error } = await supabase
    .from('gauntlet_runs')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) {
    reportError(error, 'Läufe konnten nicht geladen werden');
    run = freshRun();
    past = [];
    render();
    return;
  }

  const rows = data ?? [];
  const active = rows.find((row) => row.status === 'active');
  run = active ? fromDb(active) : freshRun();
  past = rows.filter((row) => row.status !== 'active').map(fromDb);
  render();
}

/**
 * Den Lauf sichern. Angezeigt wird schon vorher der neue Stand – geht das
 * Speichern schief, holt `loadRuns()` den echten zurück.
 */
async function save(target = run) {
  if (!currentUser) return;

  busy = true;
  render();

  let error = null;
  if (target.id) {
    ({ error } = await supabase.from('gauntlet_runs').update(toDb(target)).eq('id', target.id));
  } else {
    const result = await supabase.from('gauntlet_runs').insert(toDb(target)).select('id').single();
    error = result.error;
    if (!error) target.id = result.data.id;
  }

  busy = false;

  if (error) {
    reportError(error, 'Speichern fehlgeschlagen');
    await loadRuns();
    return;
  }

  render();
}

// ---------------------------------------------------------------- Rechenstand --

/** Alles, was sich aus der Auswahl und dem Verlauf ergibt – an einer Stelle. */
function state() {
  const pool = run.pool.filter((id) => ROSTER_IDS.includes(id));
  const total = runLength(pool, run.wildcards);
  const { plan, done, deaths, voided } = replay(run.log, total);
  const finished = done.length >= total;
  const position = finished ? total : done.length + 1;

  return {
    pool,
    total,
    plan,
    done,
    deaths,
    voided,
    finished,
    position,
    tier: tierAt(plan, position),
    percent: total ? (done.length / total) * 100 : 0,
    playable: pool.length >= MIN_POOL,
  };
}

/** Wie ein Survivor gerade dasteht – eine Einordnung für Raster und Auswahl. */
function rosterRows(s) {
  const places = new Map(s.done.map((entry, index) => [entry.survivor, index + 1]));
  const finished = new Set(completedIds(s.done));

  return ROSTER.map((survivor) => {
    const inPool = s.pool.includes(survivor.id);
    const current = run.current?.survivor === survivor.id;
    const place = places.get(survivor.id) ?? null;

    let kind = 'open';
    if (current) kind = 'current';
    else if (place) kind = 'done';
    else if (!inPool) kind = 'out';

    return {
      ...survivor,
      inPool,
      current,
      place,
      kind,
      // Wer schon im Lauf steckt, lässt sich nicht mehr herausnehmen – sonst
      // verschöbe sich der gesamte bisherige Fortschritt.
      locked: finished.has(survivor.id) || current,
    };
  });
}

// ------------------------------------------------------------------ Aktionen --

function drawSurvivor() {
  const s = state();
  if (busy || run.current || s.finished || !s.playable) return;

  const next = drawNext({ pool: s.pool, done: s.done, wildcards: run.wildcards, total: s.total });
  if (!next) {
    toast('Der Topf ist leer – aktiviere Wildcards oder nimm weitere Survivor dazu.', 'error');
    return;
  }

  run.current = next;
  save();
}

function logResult(result) {
  const s = state();
  if (busy || !run.current) return;

  // Ein Tod kostet die ganze angefangene Stufe – das sollte niemand aus
  // Versehen eintragen.
  if (result === 'died') {
    const loss = lossOnDeath(s.plan, s.position);
    if (loss.lost > 0 && !window.confirm(
      `Tod auf Platz ${s.position}: ${loss.lost} geschaffte Survivor der Stufe „${loss.tier.name}“ `
      + `wandern zurück in den Topf, weiter geht es wieder ab Platz ${loss.back}. Wirklich eintragen?`,
    )) return;
  }

  run.log = [...run.log, {
    survivor: run.current.survivor,
    wild: run.current.wild,
    result,
    position: s.position,
    at: new Date().toISOString(),
  }];

  // Nach einem Abbruch bleibt derselbe Survivor dran, sonst wird neu gezogen.
  if (result !== 'void') run.current = null;

  const after = state();
  if (after.finished) {
    run.status = 'done';
    run.finished_at = new Date().toISOString();
    toast('Geschafft – alle Survivor stehen.', 'success');
  } else if (result === 'died') {
    toast(`Zurück auf Platz ${after.position}.`);
  }

  save();
}

/** Verklickt? Der letzte Eintrag fällt weg, der Rest rechnet sich neu. */
function undoLast() {
  if (busy || !run.log.length) return;

  const last = run.log[run.log.length - 1];
  run.log = run.log.slice(0, -1);
  run.current = { survivor: last.survivor, wild: Boolean(last.wild) };
  run.status = 'active';
  run.finished_at = null;

  save();
}

async function startNewRun() {
  if (busy) return;

  const s = state();
  if (run.id && run.status === 'active' && (s.done.length || run.log.length)) {
    if (!window.confirm('Der laufende Versuch wird abgebrochen und ein neuer beginnt. Fortsetzen?')) return;
  }

  // Die Survivor-Auswahl und die Wildcards übernimmt der neue Lauf – sie sind
  // eine Einstellung, keine Eigenschaft des Versuchs.
  const settings = { pool: [...run.pool], wildcards: run.wildcards };

  if (run.id && run.status === 'active') {
    const previous = { ...run, status: 'abandoned', finished_at: new Date().toISOString(), current: null };
    await save(previous);
    past = [previous, ...past];
  } else if (run.id) {
    past = [run, ...past.filter((entry) => entry.id !== run.id)];
  }

  run = { ...freshRun(), ...settings };
  // Gleich anlegen: Sonst stünden nach einem Neuladen wieder alle Survivor da.
  await save();
  toast('Neuer Lauf steht bereit.');
}

function togglePool(id) {
  if (busy) return;

  const row = rosterRows(state()).find((entry) => entry.id === id);
  if (!row) return;

  if (row.locked) {
    toast(row.current
      ? `${row.label} ist gerade dran – erst das Match eintragen.`
      : `${row.label} ist bereits geschafft und bleibt dabei.`);
    return;
  }

  run.pool = row.inPool
    ? run.pool.filter((entry) => entry !== id)
    : [...run.pool, id].sort((a, b) => ROSTER_IDS.indexOf(a) - ROSTER_IDS.indexOf(b));

  save();
}

function setPool(ids) {
  if (busy) return;

  // Geschaffte und der aktuelle Zug bleiben in jedem Fall dabei.
  const keep = new Set(rosterRows(state()).filter((row) => row.locked).map((row) => row.id));
  run.pool = ROSTER_IDS.filter((id) => ids.includes(id) || keep.has(id));
  save();
}

function setWildcards(enabled) {
  if (busy) return;
  run.wildcards = enabled;
  save();
}

/** Zwischen Anzeige und Auswahl umschalten – dasselbe Raster, andere Rolle. */
function toggleEditing() {
  editing = !editing;
  if (editing) filter = 'all';
  render();
}

// -------------------------------------------------------------------- Anzeige --

/** "11–20", bei einer Stufe von genau einem Platz nur die eine Zahl. */
const rangeText = (tier) => (tier.from === tier.to ? `${tier.from}` : `${tier.from}–${tier.to}`);

const perkText = (count) => (count === 0 ? 'ohne Perks' : `${count} ${count === 1 ? 'Perk' : 'Perks'}`);

/** Was als Nächstes ansteht: der nächste Checkpoint oder das Ziel. */
function nextGoalText(s) {
  if (s.finished) return 'Lauf abgeschlossen';

  const last = s.plan[s.plan.length - 1];
  if (s.tier.index === last.index) return `noch ${fmtNumber(s.total - s.done.length)} bis zum Ziel`;
  return `noch ${fmtNumber(s.tier.to - s.done.length)} bis Checkpoint ${s.tier.index + 1}`;
}

/**
 * Die Stufenleiter: fünf Abschnitte, jeder so breit wie seine Stufe lang ist.
 * Sie ersetzt Fortschrittsbalken und Checkpoint-Tabelle in einem Zug.
 */
function renderLadder(s) {
  $('#status-ladder').innerHTML = s.plan.map((tier) => {
    const inTier = clamp(s.done.length - (tier.from - 1), 0, tier.size);
    const width = tier.size ? (inTier / tier.size) * 100 : 0;
    const passed = tier.size > 0 && s.done.length >= tier.to;
    const active = !s.finished && tier.index === s.tier.index;

    return `
      <li class="gstep${passed ? ' is-done' : ''}${active ? ' is-active' : ''}"
          style="flex-grow:${tier.size || 1}"
          title="${escapeHtml(`Checkpoint ${tier.index}: ${tier.name} · ${tier.requirement}`)}">
        <span class="gstep__bar"><span class="gstep__fill" style="width:${width}%"></span></span>
        <span class="gstep__name">${escapeHtml(tier.name)}</span>
        <span class="gstep__meta">${tier.size
          ? `${escapeHtml(perkText(tier.perks))} · ${rangeText(tier)}`
          : 'entfällt'}</span>
      </li>`;
  }).join('');
}

function renderStatus(s) {
  $('#page-meta').textContent = s.finished
    ? 'Lauf abgeschlossen'
    : `${fmtNumber(s.done.length)} von ${fmtNumber(s.total)} Survivorn geschafft`;

  $('#status-eyebrow').textContent = s.finished
    ? 'Alle Stufen bestanden'
    : `Checkpoint ${s.tier.index} · ${s.tier.name}`;
  $('#status-value').textContent = s.finished
    ? 'The Legend'
    : `Survivor ${fmtNumber(s.position)} von ${fmtNumber(s.total)}`;
  $('#status-hint').textContent = s.finished
    ? `${fmtNumber(s.total)} Survivor, ${fmtNumber(s.deaths)} ${s.deaths === 1 ? 'Tod' : 'Tode'} unterwegs`
    : `${perkText(s.tier.perks)} · ${s.tier.requirement}`;

  $('#status-perks').textContent = String(s.tier.perks);
  $('#status-perks-label').textContent = s.tier.perks === 1 ? 'Perk-Platz' : 'Perk-Plätze';

  renderLadder(s);

  // Die Zahlen als eine Zeile statt als vier Kacheln: Sie wiederholen zum
  // Teil, was darüber schon steht, und sollen die Karte nicht dominieren.
  const stats = [
    ['Fortschritt', fmtPercent(s.percent, 0)],
    ['Offen', `${fmtNumber(Math.max(0, s.total - s.done.length))} · ${nextGoalText(s)}`],
    ['Tode', `${fmtNumber(s.deaths)}${s.voided ? ` · ${fmtNumber(s.voided)} ohne Wertung` : ''}`],
    ['Ausgewählt', `${fmtNumber(s.pool.length)} von ${fmtNumber(ROSTER_IDS.length)}${run.wildcards ? ' · Wildcards' : ''}`],
  ];

  $('#status-stats').innerHTML = stats.map(([label, value]) => `
    <span class="gstat">
      <span class="gstat__label">${escapeHtml(label)}</span>
      <span class="gstat__value">${escapeHtml(value)}</span>
    </span>`).join('');
}

function currentHtml(s) {
  if (!s.playable) {
    return `<p class="empty">Ausgewählt sind ${fmtNumber(s.pool.length)} Survivor –
      für einen Lauf braucht es mindestens ${MIN_POOL}. Ergänze sie über „Auswahl bearbeiten“.</p>`;
  }

  if (s.finished) {
    return `
      <div class="gdraw gdraw--done">
        <div class="gdraw__text">
          <span class="gdraw__eyebrow">The Legend</span>
          <strong class="gdraw__name">Alle Survivor geschafft</strong>
          <span class="gdraw__meta">${fmtNumber(s.total)} Survivor · ${fmtNumber(s.deaths)}
            ${s.deaths === 1 ? 'Tod' : 'Tode'} · seit ${escapeHtml(fmtDay(run.started_at))}</span>
        </div>
        <div class="gactions">
          <button type="button" class="btn btn--primary" data-act="new-run">Neuen Lauf starten</button>
        </div>
      </div>`;
  }

  if (!run.current) {
    const open = s.pool.length - completedIds(s.done).length;
    return `
      <div class="gdraw gdraw--empty">
        <div class="gdraw__text">
          <span class="gdraw__eyebrow">Platz ${fmtNumber(s.position)} · ${escapeHtml(s.tier.name)}</span>
          <strong class="gdraw__name">Noch kein Survivor gezogen</strong>
          <span class="gdraw__meta">${open > 0
            ? `Gezogen wird aus ${fmtNumber(open)} offenen Survivorn · ${escapeHtml(perkText(s.tier.perks))}`
            : 'Alle ausgewählten sind geschafft – jetzt übernehmen die Wildcards.'}</span>
        </div>
        <div class="gactions">
          <button type="button" class="btn btn--primary" data-act="draw" ${busy ? 'disabled' : ''}>Survivor ziehen</button>
        </div>
      </div>`;
  }

  const id = run.current.survivor;
  const label = labelFor('survivor', id);
  const teachables = teachablePerks(id);
  const loss = lossOnDeath(s.plan, s.position);

  return `
    <div class="gdraw">
      ${avatarHtml('survivor', id, label, 'avatar--lg')}
      <div class="gdraw__text">
        <span class="gdraw__eyebrow">Platz ${fmtNumber(s.position)} von ${fmtNumber(s.total)} ·
          ${escapeHtml(s.tier.name)}</span>
        <strong class="gdraw__name">${escapeHtml(label)}${run.current.wild
          ? ' <span class="gdraw__wild">Wildcard</span>' : ''}</strong>
        <span class="gdraw__meta">${s.tier.perks === 0
          ? 'Ohne Perks – Items, Add-ons und Opfergaben bleiben erlaubt.'
          : `${perkText(s.tier.perks)} · ${escapeHtml(s.tier.requirement)}`}</span>
      </div>
      <div class="gactions">
        <button type="button" class="btn btn--good" data-act="result" data-result="escaped" ${busy ? 'disabled' : ''}>
          Entkommen
        </button>
        <button type="button" class="btn btn--bad" data-act="result" data-result="died" ${busy ? 'disabled' : ''}>
          Gestorben
        </button>
        <button type="button" class="btn btn--ghost" data-act="result" data-result="void" ${busy ? 'disabled' : ''}>
          Zählt nicht
        </button>
      </div>
    </div>

    ${s.tier.teachable === 0 || !teachables.length ? '' : `
      <div class="gteach">
        <span class="gteach__label">Eigene Perks von ${escapeHtml(label)} – einer davon erfüllt die Vorgabe</span>
        <div class="gteach__list">
          ${teachables.map((perk) => `
            <span class="gteach__item">
              ${perkIconHtml(perk.file, perk.name)}
              <span class="gteach__name">${escapeHtml(perk.name)}</span>
            </span>`).join('')}
        </div>
      </div>`}

    <p class="gdraw__note">
      ${loss.lost > 0
        ? `Ein Tod kostet ${fmtNumber(loss.lost)} ${loss.lost === 1 ? 'geschafften Survivor' : 'geschaffte Survivor'}
           und setzt auf Platz ${fmtNumber(loss.back)} zurück.`
        : 'Ein Tod kostet hier keinen Fortschritt – die Stufe hat gerade erst begonnen.'}
      „Zählt nicht“ ist für den DC vor dem ersten Generator und für Abbrüche beim Laden:
      Es geht mit demselben Survivor weiter.
    </p>`;
}

function renderCurrent(s) {
  $('#draw-panel').innerHTML = currentHtml(s);
  $('#draw-meta').textContent = run.current
    ? 'Match läuft'
    : (s.finished ? 'Fertig' : `Platz ${fmtNumber(s.position)}`);
}

/** Das Raster: im Normalfall Anzeige, beim Bearbeiten die Auswahl selbst. */
function renderRoster(s) {
  const rows = rosterRows(s);
  const counts = {
    all: rows.length,
    open: rows.filter((row) => row.kind === 'open').length,
    done: rows.filter((row) => row.kind === 'done').length,
    out: rows.filter((row) => row.kind === 'out').length,
  };

  $('#roster-count').textContent = editing
    ? `${fmtNumber(s.pool.length)} von ${fmtNumber(rows.length)} ausgewählt`
    : `${fmtNumber(counts.done)} geschafft · ${fmtNumber(counts.open)} offen`;

  const button = $('#edit-toggle');
  button.textContent = editing ? 'Fertig' : 'Auswahl bearbeiten';
  button.classList.toggle('btn--primary', editing);
  button.classList.toggle('btn--ghost', !editing);

  $('#roster-filter').hidden = editing;
  $('#roster-tools').hidden = !editing;
  $('#wildcards').checked = run.wildcards;
  $('#pool-length').textContent = run.wildcards
    ? `Der Lauf geht über ${fmtNumber(s.total)} Plätze: Sind alle ausgewählten Survivor `
      + 'geschafft, kommen bereits bestandene noch einmal dran.'
    : `Der Lauf ist so lang wie die Auswahl – aktuell ${fmtNumber(s.total)} Plätze.`;

  Object.entries(counts).forEach(([key, count]) => {
    const label = $(`#roster-filter [data-count="${key}"]`);
    if (label) label.textContent = fmtNumber(count);
  });

  // Beim Bearbeiten immer alle zeigen, sonst ließe sich nichts dazunehmen.
  const visible = editing ? rows : rows.filter((row) => filter === 'all' || row.kind === filter);
  $('#roster-empty').hidden = visible.length > 0;

  $('#roster-grid').innerHTML = visible.map((row) => {
    const mark = editing
      ? (row.locked ? 'im Lauf' : (row.inPool ? 'dabei' : 'nicht dabei'))
      : ({ current: 'im Zug', done: `Nr. ${row.place}`, out: 'nicht dabei' }[row.kind] ?? 'offen');

    const classes = ['gsel', `gsel--${row.kind}`];
    if (editing) classes.push('gsel--edit', row.inPool ? 'is-on' : 'is-off');
    if (editing && row.locked) classes.push('is-locked');

    const inner = `
      ${avatarHtml('survivor', row.id, row.label)}
      <span class="gsel__text">
        <span class="gsel__name">${escapeHtml(row.label)}</span>
        <span class="gsel__mark">${escapeHtml(mark)}</span>
      </span>`;

    return editing
      ? `<button type="button" class="${classes.join(' ')}" data-act="pool-toggle"
                 data-id="${escapeHtml(row.id)}" aria-pressed="${row.inPool}">${inner}</button>`
      : `<div class="${classes.join(' ')}">${inner}</div>`;
  }).join('');
}

function renderLog(s) {
  const entries = [...run.log].reverse();
  const shown = entries.slice(0, LOG_LIMIT);

  $('#log-count').textContent = entries.length
    ? `${fmtNumber(entries.length)} ${entries.length === 1 ? 'Versuch' : 'Versuche'}`
    : 'Noch nichts gespielt';
  $('#log-undo').disabled = busy || !entries.length;

  $('#log-list').innerHTML = shown.length
    ? shown.map((entry) => {
      const label = labelFor('survivor', entry.survivor);
      return `
        <li class="glog glog--${escapeHtml(entry.result)}">
          ${avatarHtml('survivor', entry.survivor, label)}
          <span class="glog__text">
            <span class="glog__name">${escapeHtml(label)}${entry.wild
              ? ' <span class="gdraw__wild">Wildcard</span>' : ''}</span>
            <span class="glog__meta">Platz ${fmtNumber(entry.position ?? 0)} · ${escapeHtml(fmtDate(entry.at))}</span>
          </span>
          <span class="glog__result">${escapeHtml(RESULT_LABELS[entry.result] ?? entry.result)}</span>
        </li>`;
    }).join('')
    : '<li class="empty">Sobald du einen Versuch einträgst, steht er hier.</li>';

  const rest = entries.length - shown.length;
  $('#log-hint').textContent = [
    rest > 0 ? `${fmtNumber(rest)} ältere nicht gezeigt` : '',
    s.deaths ? `${fmtNumber(s.deaths)} ${s.deaths === 1 ? 'Tod' : 'Tode'} in diesem Lauf` : '',
  ].filter(Boolean).join(' · ');
}

function renderPast() {
  $('#past-count').textContent = past.length
    ? `${fmtNumber(past.length)} ${past.length === 1 ? 'Lauf' : 'Läufe'}`
    : 'Noch keiner beendet';

  $('#past-list').innerHTML = past.length
    ? past.map((entry) => {
      const total = runLength(entry.pool, entry.wildcards);
      const { done, deaths } = replay(entry.log, total);
      return `
        <li class="gpast">
          <span class="gpast__badge gpast__badge--${entry.status === 'done' ? 'done' : 'gone'}">
            ${entry.status === 'done' ? 'Geschafft' : 'Abgebrochen'}
          </span>
          <span class="gpast__text">
            <span class="gpast__main">${fmtNumber(done.length)} von ${fmtNumber(total)} Survivorn</span>
            <span class="gpast__meta">${escapeHtml(fmtDay(entry.started_at))}
              bis ${escapeHtml(fmtDay(entry.finished_at ?? entry.started_at))} ·
              ${fmtNumber(deaths)} ${deaths === 1 ? 'Tod' : 'Tode'}</span>
          </span>
        </li>`;
    }).join('')
    : '<li class="empty">Abgeschlossene und abgebrochene Läufe sammeln sich hier.</li>';
}

/** Die Checkpoint-Tabelle steht bei den Regeln – dort wird nachgeschlagen. */
function renderTiers(s) {
  $('#tier-list').innerHTML = s.plan.map((tier) => {
    const passed = tier.size > 0 && s.done.length >= tier.to;
    const active = !s.finished && tier.index === s.tier.index;
    const cls = tier.size === 0 ? ' gtier--empty' : (passed ? ' gtier--done' : (active ? ' gtier--active' : ''));

    return `
      <article class="gtier${cls}">
        <span class="gtier__no">Checkpoint ${tier.index}</span>
        <span class="gtier__name">${escapeHtml(tier.name)}</span>
        <span class="gtier__range">${tier.size ? `Survivor ${rangeText(tier)}` : 'entfällt'}</span>
        <span class="gtier__perks" title="Erlaubte Perk-Plätze">${tier.perks}</span>
        <span class="gtier__req">${escapeHtml(tier.requirement)}</span>
        <span class="gtier__state">${tier.size === 0 ? '–' : (passed ? 'geschafft' : (active ? 'läuft' : 'offen'))}</span>
      </article>`;
  }).join('');
}

function render() {
  const s = state();

  renderStatus(s);
  renderCurrent(s);
  renderRoster(s);
  renderLog(s);
  renderPast();
  renderTiers(s);

  mountIcons();
}

// ----------------------------------------------------------------- Verdrahtung --

/*
  Ein Klick-Empfänger für die ganze Seite: Die Karten werden bei jedem Schritt
  neu gebaut, einzeln verdrahtete Knöpfe müssten also jedes Mal mitwandern.
*/
const appView = document.getElementById('app-view');

appView.addEventListener('click', (event) => {
  const target = event.target.closest('[data-act]');
  if (!target) return;

  const actions = {
    draw: drawSurvivor,
    result: () => logResult(target.dataset.result),
    undo: undoLast,
    edit: toggleEditing,
    'new-run': startNewRun,
    'pool-toggle': () => togglePool(target.dataset.id),
    'pool-all': () => setPool(ROSTER_IDS),
    'pool-none': () => setPool([]),
  };

  actions[target.dataset.act]?.();
});

appView.addEventListener('change', (event) => {
  if (event.target.id === 'wildcards') setWildcards(event.target.checked);
  if (event.target.name === 'roster-filter') {
    filter = event.target.value;
    render();
  }
});

initCollapse();
mountIcons();

initAuth({
  onLogin: async (user) => {
    currentUser = user;
    await loadRuns();
  },
  onLogout: () => {
    currentUser = null;
    run = freshRun();
    past = [];
    editing = false;
  },
});
