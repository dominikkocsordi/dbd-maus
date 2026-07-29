// Passkeys (WebAuthn) über Supabase Auth – Anmeldung und Verwaltung.
import { supabase } from './supabase.js?v=15';
import { escapeHtml, fmtDate, toast } from './utils.js?v=15';

/** Browser ohne WebAuthn (z. B. ältere Mobile-Browser) bekommen die Buttons erst gar nicht. */
export function passkeysSupported() {
  return typeof window.PublicKeyCredential !== 'undefined';
}

/** Übersetzt Supabase- und WebAuthn-Fehler in verständliche Meldungen. */
export function passkeyErrorMessage(error) {
  const code = error?.code ?? error?.name;

  switch (code) {
    case 'NotAllowedError':
      return 'Abgebrochen oder zu lange gewartet. Bitte erneut versuchen.';
    case 'InvalidStateError':
      return 'Für dieses Gerät ist bereits ein Passkey hinterlegt.';
    case 'SecurityError':
      return 'Die Domain passt nicht zur Passkey-Konfiguration (Relying Party ID/Origin) im Supabase-Projekt.';
    case 'passkey_disabled':
      return 'Passkeys sind im Supabase-Projekt nicht aktiviert (Authentication → Passkeys).';
    case 'too_many_passkeys':
      return 'Maximale Anzahl an Passkeys für diesen Account erreicht.';
    case 'webauthn_credential_exists':
      return 'Dieser Authenticator ist bereits für den Account registriert.';
    case 'webauthn_credential_not_found':
      return 'Zu diesem Passkey gibt es keinen Account. Melde dich per E-Mail an und lege dort einen Passkey an.';
    case 'webauthn_challenge_expired':
    case 'webauthn_challenge_not_found':
      return 'Die Anfrage ist abgelaufen. Bitte noch einmal starten.';
    case 'webauthn_verification_failed':
      return 'Der Passkey konnte nicht verifiziert werden.';
    case 'email_not_confirmed':
      return 'Bitte zuerst die E-Mail-Adresse bestätigen.';
    default:
      return error?.message ?? 'Unbekannter Passkey-Fehler.';
  }
}

/** Meldet per Passkey an; die Session setzt Supabase selbst (onAuthStateChange). */
export async function signInWithPasskey() {
  const { error } = await supabase.auth.signInWithPasskey();
  return error ?? null;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.passkeys ?? [];
}

// ------------------------------------------------------------- Verwaltung --

function hint(message, type = 'info') {
  const el = document.getElementById('passkey-hint');
  if (!el) return;
  el.textContent = message ?? '';
  el.className = `passkey-hint passkey-hint--${type}`;
}

function renderList(passkeys) {
  const list = document.getElementById('passkey-list');
  if (!list) return;

  if (!passkeys.length) {
    list.innerHTML = '<p class="empty">Noch kein Passkey hinterlegt.</p>';
    return;
  }

  list.innerHTML = passkeys.map((pk) => `
    <div class="passkey-item">
      <span class="passkey-item__icon" aria-hidden="true">&#128273;</span>
      <span class="passkey-item__main">
        <strong>${escapeHtml(pk.friendly_name || 'Passkey')}</strong>
        <span class="passkey-item__meta">
          angelegt am ${fmtDate(pk.created_at)}${pk.last_used_at ? ` · zuletzt genutzt ${fmtDate(pk.last_used_at)}` : ''}
        </span>
      </span>
      <button type="button" class="btn btn--ghost btn--sm" data-passkey-rename="${escapeHtml(pk.id)}">Umbenennen</button>
      <button type="button" class="icon-btn" data-passkey-delete="${escapeHtml(pk.id)}" title="Passkey entfernen" aria-label="Passkey entfernen">&#10005;</button>
    </div>`).join('');

  list.querySelectorAll('[data-passkey-rename]').forEach((btn) => {
    btn.addEventListener('click', () => renamePasskey(btn.dataset.passkeyRename));
  });
  list.querySelectorAll('[data-passkey-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deletePasskey(btn.dataset.passkeyDelete));
  });
}

async function loadPasskeys() {
  const { data, error } = await supabase.auth.passkey.list();
  if (error) {
    hint(passkeyErrorMessage(error), 'error');
    renderList([]);
    return;
  }
  hint('');
  renderList(normalizeList(data));
}

async function addPasskey() {
  const btn = document.getElementById('passkey-add');
  btn.disabled = true;
  hint('Folge der Abfrage deines Geräts …');

  const { data, error } = await supabase.auth.registerPasskey();
  btn.disabled = false;

  if (error) {
    hint(passkeyErrorMessage(error), 'error');
    return;
  }

  toast(`Passkey „${data?.friendly_name || 'Passkey'}“ hinzugefügt.`, 'success');
  await loadPasskeys();
}

async function renamePasskey(passkeyId) {
  const friendlyName = window.prompt('Neuer Name für den Passkey:');
  if (friendlyName === null) return;

  const { error } = await supabase.auth.passkey.update({
    passkeyId,
    friendlyName: friendlyName.trim().slice(0, 120),
  });
  if (error) return hint(passkeyErrorMessage(error), 'error');

  toast('Passkey umbenannt.');
  await loadPasskeys();
}

async function deletePasskey(passkeyId) {
  if (!window.confirm('Diesen Passkey wirklich entfernen?')) return;

  const { error } = await supabase.auth.passkey.delete({ passkeyId });
  if (error) return hint(passkeyErrorMessage(error), 'error');

  toast('Passkey entfernt.');
  await loadPasskeys();
}

let panelWired = false;

/** Initialisiert das Passkey-Panel auf der Übersichtsseite. */
export function initPasskeyPanel() {
  const panel = document.getElementById('passkey-panel');
  if (!panel) return;

  if (!passkeysSupported()) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  if (!panelWired) {
    document.getElementById('passkey-add').addEventListener('click', addPasskey);
    panelWired = true;
  }
  loadPasskeys();
}
