// Charakterbilder aus Supabase Storage.
// Bucket "characters", darin die Ordner "killers" und "survivors";
// der Dateiname ist die ID aus data.js plus Endung, z. B. killers/blight.png.
import { SUPABASE_URL } from './config.js';
import { escapeHtml } from './utils.js';

export const CHARACTER_BUCKET = 'characters';
export const IMAGE_EXT = 'png';

export function characterImageUrl(role, id) {
  if (!id) return null;
  const folder = role === 'killer' ? 'killers' : 'survivors';
  return `${SUPABASE_URL}/storage/v1/object/public/${CHARACTER_BUCKET}/${folder}/${encodeURIComponent(id)}.${IMAGE_EXT}`;
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
    ${url ? `<img src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
  </span>`;
}

/** Avatar plus Name – das Standard-Layout in den Tabellen. */
export function characterCellHtml(role, id, label) {
  return `<span class="char-cell">${avatarHtml(role, id, label)}<span class="char-cell__name">${escapeHtml(label)}</span></span>`;
}
