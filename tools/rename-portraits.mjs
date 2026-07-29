#!/usr/bin/env node
/**
 * Benennt die offiziellen DBD-Portraits auf die IDs aus assets/js/data.js um.
 *
 *   node tools/rename-portraits.mjs <quell-ordner> [ziel-ordner]
 *
 * Aus "K01_TheTrapper_Portrait.png" wird "killers/trapper.png",
 * aus "S09_FengMin_Portrait.png"    wird "survivors/feng_min.png".
 *
 * Die Originaldateien bleiben unangetastet – es wird kopiert, nicht verschoben.
 * Nicht zuzuordnende Dateien werden am Ende aufgelistet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { KILLERS, SURVIVORS } = await import(path.join(here, '..', 'assets', 'js', 'data.js'));

const [, , sourceArg, targetArg] = process.argv;
if (!sourceArg) {
  console.error('Aufruf: node tools/rename-portraits.mjs <quell-ordner> [ziel-ordner]');
  process.exit(1);
}

const sourceDir = path.resolve(sourceArg);
const targetDir = path.resolve(targetArg ?? 'portraits-umbenannt');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** Kleinschreibung, Umlaute/Akzente weg, alles außer a–z und 0–9 raus. */
const norm = (value) => String(value)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

// ------------------------------------------------------ Suchtabelle bauen --

const lookup = new Map();
const ambiguous = new Set();

function addKey(key, entry) {
  if (!key || key.length < 3) return;
  const existing = lookup.get(key);
  if (existing && existing.id !== entry.id) {
    ambiguous.add(key);        // z. B. "david" – kommt zweimal vor
    return;
  }
  lookup.set(key, entry);
}

for (const [role, list] of [['killer', KILLERS], ['survivor', SURVIVORS]]) {
  for (const { id, label } of list) {
    if (id.startsWith('other_')) continue;
    const entry = { role, id, label };

    addKey(norm(id), entry);              // trapper, skull_merchant -> skullmerchant
    addKey(norm(label), entry);           // Trapper, David (King) -> davidking
    addKey(`the${norm(id)}`, entry);      // falls "The" doch stehen bleibt

    // Namensteile als Alias: ellen_ripley -> "ripley", trevor_belmont -> "belmont"
    for (const part of id.split('_')) addKey(norm(part), entry);
  }
}

for (const key of ambiguous) lookup.delete(key);

// ------------------------------------------------------------ Dateien lesen --

if (!fs.existsSync(sourceDir)) {
  console.error(`Quell-Ordner nicht gefunden: ${sourceDir}`);
  process.exit(1);
}

const files = fs.readdirSync(sourceDir, { withFileTypes: true })
  .filter((e) => e.isFile() && IMAGE_EXTS.has(path.extname(e.name).toLowerCase()))
  .map((e) => e.name);

if (!files.length) {
  console.error(`Keine Bilddateien in ${sourceDir}`);
  process.exit(1);
}

/** "K01_TheTrapper_Portrait" -> { roleHint: 'killer', key: 'trapper' } */
function parseName(fileName) {
  const base = path.basename(fileName, path.extname(fileName));

  const prefix = base.match(/^([ks])\s*0*(\d+)[_-]/i);
  const roleHint = prefix ? (prefix[1].toLowerCase() === 'k' ? 'killer' : 'survivor') : null;

  let rest = prefix ? base.slice(prefix[0].length) : base;
  rest = rest.replace(/[_-]?portrait.*$/i, '');    // "_Portrait", "_Portrait_01", …
  rest = rest.replace(/[_-]?(charselect|icon|avatar|store)$/i, '');

  const key = norm(rest).replace(/^the/, '');
  return { roleHint, key, rest };
}

// ----------------------------------------------------------------- Kopieren --

const matched = [];
const unmatched = [];
const collisions = new Map();

for (const file of files) {
  const { roleHint, key, rest } = parseName(file);
  const entry = lookup.get(key) ?? lookup.get(norm(rest));

  if (!entry || (roleHint && entry.role !== roleHint)) {
    unmatched.push(file);
    continue;
  }

  const folder = entry.role === 'killer' ? 'killers' : 'survivors';
  const targetName = `${folder}/${entry.id}${path.extname(file).toLowerCase()}`;

  if (collisions.has(targetName)) {
    unmatched.push(`${file} (Ziel ${targetName} schon von ${collisions.get(targetName)} belegt)`);
    continue;
  }
  collisions.set(targetName, file);

  fs.mkdirSync(path.join(targetDir, folder), { recursive: true });
  fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, targetName));
  matched.push({ file, targetName, label: entry.label });
}

// ------------------------------------------------------------------ Bericht --

console.log(`\nZiel-Ordner: ${targetDir}\n`);
for (const m of matched) console.log(`  ${m.file}  ->  ${m.targetName}   (${m.label})`);

console.log(`\n${matched.length} von ${files.length} Dateien zugeordnet.`);

if (unmatched.length) {
  console.log(`\nNicht zugeordnet (${unmatched.length}) – bitte von Hand benennen:`);
  for (const file of unmatched) console.log(`  ${file}`);
  console.log('\nGültige IDs stehen in supabase/bilder-dateinamen.txt.');
}

const otherExts = new Set(matched.map((m) => path.extname(m.targetName)).filter((e) => e !== '.png'));
if (otherExts.size) {
  console.log(`\nHinweis: ${[...otherExts].join(', ')} statt .png – dann IMAGE_EXT in`
    + ' assets/js/images.js anpassen (eine Endung für alle Dateien).');
}

const covered = new Set(matched.map((m) => m.targetName));
const missing = [...KILLERS.map((k) => ['killers', k]), ...SURVIVORS.map((s) => ['survivors', s])]
  .filter(([folder, c]) => !c.id.startsWith('other_')
    && ![...covered].some((t) => t.startsWith(`${folder}/${c.id}.`)))
  .map(([folder, c]) => `${folder}/${c.id} (${c.label})`);

if (missing.length) {
  console.log(`\nOhne Bild geblieben (${missing.length}) – in der App erscheinen dort die Initialen:`);
  for (const entry of missing) console.log(`  ${entry}`);
}
