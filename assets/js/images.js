// Charakterbilder aus Supabase Storage.
// Die Originaldateien aus dem Spiel liegen unverändert im Bucket "characters"
// (z. B. K01_TheTrapper_Portrait.png); die Zuordnung steht als `file` in data.js.
import { SUPABASE_URL } from './config.js?v=40';
import { fileFor } from './data.js?v=40';
import { escapeHtml } from './utils.js?v=40';

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
