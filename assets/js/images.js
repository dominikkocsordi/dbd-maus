// Charakterbilder aus Supabase Storage.
// Die Originaldateien aus dem Spiel liegen unverändert im Bucket "characters"
// (z. B. K01_TheTrapper_Portrait.png); die Zuordnung steht als `file` in data.js.
import { SUPABASE_URL } from './config.js?v=68';
import { fileFor } from './data.js?v=68';
import { loadoutEntry } from './loadout.js?v=68';
import { escapeHtml } from './utils.js?v=68';

export const CHARACTER_BUCKET = 'characters';
export const ICON_BUCKET = 'icons';
export const PERK_BUCKET = 'perks';

/** Bild eines Perks; `file` ist der Dateiname aus perks.js. */
export function perkImageUrl(file) {
  if (!file) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${PERK_BUCKET}/${encodeURIComponent(file)}`;
}

/** Perk-Kachelbild mit Namenskürzel als Fallback. */
export function perkIconHtml(file, name, modifier = '') {
  const url = perkImageUrl(file);
  const short = String(name ?? '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';
  return `<span class="perk-icon${modifier ? ` ${modifier}` : ''}" title="${escapeHtml(name ?? '')}">
    <span class="perk-icon__fallback">${escapeHtml(short)}</span>
    ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
  </span>`;
}

/*
  Items, Add-ons und Opfergaben liegen je in einem eigenen Bucket. Die Dateien
  behalten ihre Original-Namen aus dem Spiel (iconItems_flashlight.png), genau
  wie Portraits und Perks; welcher Name zu welcher ID gehört, steht als `file`
  in loadout.js. Fehlt dort einer, bleibt das Namenskürzel stehen – und ein
  Bild, das sich doch nicht laden lässt, blendet sich selbst aus.
*/
export const LOADOUT_BUCKETS = {
  item: 'items',
  power: 'powers',
  addon: 'addons',
  offering: 'offerings',
  class: 'classes',
};

/*
  Behaviours eigener Asset-Server – von dort holt auch die offizielle
  Tracker-Seite ihre Symbole. Der Import merkt sich zu jedem Teil den Pfad
  (z. B. "add-ons/Addon_K25Power_16.png"), damit etwas zu sehen ist, solange
  das Bild noch nicht im eigenen Bucket liegt.
*/
export const TRACKER_ASSETS = 'https://assets.live.bhvraccount.com';

/* Dort heißt jede Datei nach ihrer Spiel-ID, nur der Ordner richtet sich nach
   der Art – Killer-Kräfte liegen bei den Items, die Klassen aus 2v8 in einem
   eigenen Ordner. */
const TRACKER_DIRS = {
  item: 'items',
  addon: 'add-ons',
  offering: 'offerings',
  class: 'characterClasses',
};

/**
 * Bild beim Tracker. Der Pfad ergibt sich aus der ID und kann darum nicht am
 * falschen Teil landen; ein vom Import mitgebrachter Pfad geht trotzdem vor,
 * falls Behaviour einmal von seinem Muster abweicht.
 */
export function trackerImageUrl(kind, id) {
  const path = loadoutEntry(kind, id)?.path
    ?? (TRACKER_DIRS[kind] && id ? `${TRACKER_DIRS[kind]}/${id}.png` : null);

  return path ? `${TRACKER_ASSETS}/${path.split('/').map(encodeURIComponent).join('/')}` : null;
}

/** Bild im eigenen Bucket – nur wo im Katalog ein Dateiname hinterlegt ist. */
export function loadoutBucketUrl(kind, id) {
  const entry = loadoutEntry(kind, id);
  if (!entry?.file) return null;

  // Item und Power stehen im selben Katalog, ihre Bilder aber in getrennten
  // Buckets – der Killer bringt eine Power mit, der Survivor ein Item.
  const bucket = kind === 'item' && entry.role === 'killer'
    ? LOADOUT_BUCKETS.power
    : LOADOUT_BUCKETS[kind];

  if (!bucket) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(entry.file)}`;
}

export const loadoutImageUrl = (kind, id) => trackerImageUrl(kind, id) ?? loadoutBucketUrl(kind, id);

/** Kachel für ein Item, Add-on oder eine Opfergabe – gleiche Optik wie die Perks. */
export function loadoutIconHtml(kind, id, name, modifier = '') {
  if (!id) return '';

  /*
    Der Tracker zuerst: sein Pfad steckt in der ID und trifft darum immer das
    richtige Teil. Kommt von dort nichts (kein Netz, Bild abgezogen), springt
    das eigene Bucket ein – dafür trägt das Bild seine Ersatzadresse mit sich.
  */
  const url = trackerImageUrl(kind, id);
  const fallback = loadoutBucketUrl(kind, id);
  const src = url ?? fallback;
  const short = String(name ?? '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';

  /*
    Kennt der Katalog den Eintrag nicht, steht im Tooltip zusätzlich die
    Spiel-ID. Nur daran lässt sich nachtragen, was fehlt – der angezeigte Name
    ist in dem Fall bloß aus der ID abgeleitet und taugt nicht als Schlüssel.
  */
  const title = loadoutEntry(kind, id) ? (name ?? '') : `${name ?? ''} · ${id}`;

  const swap = url && fallback
    ? `onerror="this.onerror=null;this.src=this.dataset.fallback"`
    : 'onerror="this.remove()"';

  return `<span class="perk-icon perk-icon--${kind}${modifier ? ` ${modifier}` : ''}" title="${escapeHtml(title)}">
    <span class="perk-icon__fallback">${escapeHtml(short)}</span>
    ${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy"
      ${url && fallback ? `data-fallback="${escapeHtml(fallback)}"` : ''} ${swap}>` : ''}
  </span>`;
}

/** Icons aus dem Bucket "icons" – Schlüssel entspricht dem data-icon-Attribut. */
export const ICONS = {
  logo: 'dbd_logo.jpg',
  bp: 'bp_icon.png',
  killer: 'killer_icon.png',
  survivor: 'survivor_icon.png',
  escape: 'icon_escape.png',
  sacrificed: 'icon_sacrificed.png',
};

export function iconUrl(name) {
  const file = ICONS[name];
  return file ? `${SUPABASE_URL}/storage/v1/object/public/${ICON_BUCKET}/${file}` : null;
}

/** Fertiges Icon-Markup für dynamisch erzeugte Inhalte (Tabellen, Listen). */
export function iconHtml(name, fallback = '') {
  const url = iconUrl(name);
  if (!url) return fallback ? `<span class="icon"><i class="icon__fallback">${escapeHtml(fallback)}</i></span>` : '';
  return `<span class="icon">${fallback ? `<i class="icon__fallback">${escapeHtml(fallback)}</i>` : ''}<img src="${escapeHtml(url)}" alt="" onerror="this.remove()"></span>`;
}

/**
 * Ausgang eines Survivor-Matches: nur das Symbol, dafür groß und farbig
 * hinterlegt. Der Haken bzw. das Kreuz springt ein, falls das Bild fehlt.
 */
export function outcomeIconHtml(escaped) {
  const label = escaped ? 'Entkommen' : 'Gestorben';
  const icon = escaped ? iconHtml('escape', '✓') : iconHtml('sacrificed', '✕');

  return `<span class="outcome outcome--${escaped ? 'good' : 'bad'}" title="${label}">`
    + `${icon}<span class="sr-only">${label}</span></span>`;
}

/**
 * Kills als Totenköpfe: ein Symbol je Kill statt "3K". Ohne Kill bleibt der
 * Gedankenstrich stehen, damit die Zelle nicht leer wirkt.
 */
export function killMarksHtml(kills) {
  const count = Math.max(0, Number(kills) || 0);
  const label = `${count} ${count === 1 ? 'Kill' : 'Kills'}`;

  if (!count) return `<span class="kills kills--none" title="${label}">–<span class="sr-only"> ${label}</span></span>`;

  return `<span class="kills" title="${label}">`
    + iconHtml('sacrificed', '\u{1F480}').repeat(count)
    + `<span class="sr-only">${label}</span></span>`;
}

/**
 * Hängt in jedes <span data-icon="killer"> das passende Bild.
 * Vorhandener Inhalt bleibt als Fallback stehen und wird sichtbar, sobald das
 * Bild fehlt. Bewusst ohne loading="lazy": die Icons stecken beim Parsen noch
 * im ausgeblendeten #app-view, und dort laden manche Browser faule Bilder nicht.
 */
export function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const url = iconUrl(el.dataset.icon);
    if (!url || el.querySelector('img')) return;
    el.classList.add('icon');
    el.insertAdjacentHTML('beforeend', `<img src="${escapeHtml(url)}" alt="" onerror="this.remove()">`);
  });
}

/** Unterordner im Bucket, leer = direkt im Bucket-Root. Mit / am Ende, z. B. 'portraits/'. */
export const IMAGE_FOLDER = '';

export function characterImageUrl(role, id) {
  const file = fileFor(role, id);
  if (!file) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${CHARACTER_BUCKET}/${IMAGE_FOLDER}${encodeURIComponent(file)}`;
}

function initials(label) {
  const words = String(label ?? '').trim().split(/[\s(]+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Avatar mit Bild und Initialen-Fallback. Fehlt das Bild im Bucket, blendet
 * sich das <img> selbst aus und die Initialen bleiben stehen.
 */
export function avatarHtml(role, id, label, modifier = '') {
  const url = characterImageUrl(role, id);
  const safeLabel = escapeHtml(label ?? '');

  return `<span class="avatar avatar--${role}${modifier ? ` ${modifier}` : ''}" title="${safeLabel}">
    <span class="avatar__fallback">${escapeHtml(initials(label))}</span>
    ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy"
      onload="this.parentNode.classList.add('avatar--has-image')"
      onerror="this.remove()">` : ''}
  </span>`;
}

/** Avatar plus Name (und optional eine Zeile Kleingedrucktes) für die Tabellen. */
export function characterCellHtml(role, id, label, sub = '') {
  return `<span class="char-cell">
    ${avatarHtml(role, id, label)}
    <span class="char-cell__text">
      <span class="char-cell__name">${escapeHtml(label)}</span>
      ${sub ? `<span class="char-cell__sub">${escapeHtml(sub)}</span>` : ''}
    </span>
  </span>`;
}
