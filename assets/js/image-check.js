// Selbsttest für die Bilder: lädt jedes Motiv aus den Katalogen und meldet,
// was nicht ankommt.
//
// Zwei Fehlerbilder lassen sich damit unterscheiden, und genau darauf kommt es
// an: Schlägt ein ganzer Bucket fehl, stimmt etwas mit dem Bucket selbst nicht
// (meist steht er nicht auf öffentlich). Fallen nur einzelne Dateien aus, ist
// der Dateiname im Katalog falsch.

import { KILLERS, SURVIVORS } from './data.js?v=55';
import { PERKS } from './perks.js?v=55';
import { ADDONS, ITEMS, OFFERINGS } from './loadout.js?v=55';
import { characterImageUrl, loadoutImageUrl, perkImageUrl } from './images.js?v=55';
import { escapeHtml, fmtNumber, toast } from './utils.js?v=55';

/** Alles, was ein Bild haben sollte, mit Bucket und erwarteter Adresse. */
function catalogue() {
  const out = [];
  const push = (bucket, label, file, url) => out.push({ bucket, label, file, url });

  for (const [role, list] of [['killer', KILLERS], ['survivor', SURVIVORS]]) {
    for (const entry of list) {
      if (entry.file === 'empty.png') continue;      // Platzhalter, kein Motiv
      push('characters', entry.label, entry.file, characterImageUrl(role, entry.id));
    }
  }
  for (const perk of PERKS) push('perks', perk.name, perk.file, perkImageUrl(perk.file));

  for (const entry of ITEMS) {
    push(entry.role === 'killer' ? 'powers' : 'items', entry.name, entry.file,
      loadoutImageUrl('item', entry.id));
  }
  for (const entry of ADDONS) push('addons', entry.name, entry.file, loadoutImageUrl('addon', entry.id));
  for (const entry of OFFERINGS) push('offerings', entry.name, entry.file, loadoutImageUrl('offering', entry.id));

  return out;
}

/* Ein Bild laden und sagen, ob es ankommt – mehr macht der Test nicht. */
const loads = (url) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(true);
  img.onerror = () => resolve(false);
  img.src = url;
});

/** Nacheinander in kleinen Gruppen, damit der Browser nicht dichtmacht. */
async function inBatches(entries, size, onProgress) {
  const failed = [];
  for (let i = 0; i < entries.length; i += size) {
    const batch = entries.slice(i, i + size);
    const results = await Promise.all(batch.map((e) => (e.url ? loads(e.url) : Promise.resolve(false))));
    batch.forEach((entry, n) => { if (!results[n]) failed.push(entry); });
    onProgress(Math.min(i + size, entries.length), entries.length);
  }
  return failed;
}

/**
 * Ergebnis je Bucket. `ohneDatei` sind Einträge, für die im Katalog gar kein
 * Dateiname steht – die können nicht ankommen und sind kein Bucket-Problem.
 */
function summarise(entries, failed) {
  const buckets = new Map();
  for (const e of entries) {
    if (!buckets.has(e.bucket)) buckets.set(e.bucket, { bucket: e.bucket, total: 0, bad: [] });
    buckets.get(e.bucket).total += 1;
  }
  for (const e of failed) buckets.get(e.bucket).bad.push(e);

  return [...buckets.values()].map((b) => ({
    ...b,
    ohneDatei: b.bad.filter((e) => !e.file),
    kaputt: b.bad.filter((e) => e.file),
    allesTot: b.bad.length === b.total,
  }));
}

const BUCKET_TOT = 'Kein einziges Bild kommt an – der Bucket steht vermutlich nicht auf '
  + 'öffentlich. supabase/storage.sql einspielen.';

function reportHtml(groups) {
  return groups.map((g) => {
    const zeilen = [
      `<strong>${escapeHtml(g.bucket)}</strong> – ${fmtNumber(g.total - g.bad.length)}/${fmtNumber(g.total)} geladen`,
      g.allesTot ? `<span class="imgcheck__hint">${BUCKET_TOT}</span>` : '',
      g.ohneDatei.length
        ? `<span class="imgcheck__hint">${fmtNumber(g.ohneDatei.length)} ohne hinterlegte Datei: ${
          escapeHtml(g.ohneDatei.map((e) => e.label).join(', '))}</span>`
        : '',
      g.kaputt.length && !g.allesTot
        ? `<ul class="imgcheck__list">${g.kaputt.map((e) =>
          `<li>${escapeHtml(e.label)} <code>${escapeHtml(e.file)}</code></li>`).join('')}</ul>`
        : '',
    ].filter(Boolean);

    return `<li class="imgcheck__bucket${g.bad.length ? ' is-bad' : ''}">${zeilen.join('')}</li>`;
  }).join('');
}

/* Dieselbe Auskunft als reiner Text – zum Weiterschicken. */
function reportText(groups) {
  const out = [];
  for (const g of groups) {
    out.push(`${g.bucket}: ${g.total - g.bad.length}/${g.total} geladen`);
    if (g.allesTot) out.push(`  ${BUCKET_TOT}`);
    if (g.ohneDatei.length) out.push(`  ohne Datei: ${g.ohneDatei.map((e) => e.label).join(', ')}`);
    if (g.kaputt.length && !g.allesTot) {
      for (const e of g.kaputt) out.push(`  fehlt: ${e.label} -> ${e.file}`);
    }
  }
  return out.join('\n');
}

export function initImageCheck() {
  const panel = document.getElementById('check-panel');
  if (!panel) return;
  panel.hidden = false;

  const button = document.getElementById('check-run');
  const copy = document.getElementById('check-copy');
  const status = document.getElementById('check-status');
  const result = document.getElementById('check-result');
  let text = '';

  button.addEventListener('click', async () => {
    const entries = catalogue();
    button.disabled = true;
    copy.hidden = true;
    result.innerHTML = '';
    status.textContent = `0 / ${fmtNumber(entries.length)} geprüft …`;

    const failed = await inBatches(entries, 12, (done, total) => {
      status.textContent = `${fmtNumber(done)} / ${fmtNumber(total)} geprüft …`;
    });

    const groups = summarise(entries, failed);
    status.textContent = failed.length
      ? `${fmtNumber(failed.length)} von ${fmtNumber(entries.length)} Bildern fehlen.`
      : `Alle ${fmtNumber(entries.length)} Bilder sind da.`;
    result.innerHTML = `<ul class="imgcheck">${reportHtml(groups)}</ul>`;
    text = reportText(groups);
    copy.hidden = false;
    button.disabled = false;
  });

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Bericht kopiert.', 'success');
    } catch {
      toast('Kopieren ging nicht – Text bitte von Hand markieren.', 'error');
    }
  });
}
