import { supabase } from './supabase.js?v=70';
import { initAuth } from './auth.js?v=70';
import { initPasskeyPanel } from './passkeys.js?v=70';
import { initImageCheck } from './image-check.js?v=70';
import { mountIcons } from './images.js?v=70';
import { loadProfile, roleLabel } from './profile.js?v=70';
import { fmtDate, toast } from './utils.js?v=70';

function hint(id, message, type = 'info') {
  const el = document.getElementById(id);
  el.textContent = message ?? '';
  el.className = `form-hint form-hint--${type}`;
}

function busy(form, isBusy, label) {
  form.querySelectorAll('button, input').forEach((el) => { el.disabled = isBusy; });
  const submit = form.querySelector('button[type="submit"]');
  if (submit && label) submit.textContent = label;
}

// ------------------------------------------------------------------ E-Mail --

async function changeEmail(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = document.getElementById('set-email').value.trim();
  if (!email) return hint('email-hint', 'Bitte eine E-Mail-Adresse eintragen.', 'error');

  busy(form, true, 'Ändere …');
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
  );
  busy(form, false, 'E-Mail ändern');

  if (error) return hint('email-hint', error.message, 'error');

  document.getElementById('set-email').value = '';
  hint('email-hint', 'Bestätigungslink verschickt – die Änderung greift erst nach dem Klick darauf.', 'success');
}

// ---------------------------------------------------------------- Passwort --

async function changePassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const password = document.getElementById('set-password').value;
  const repeat = document.getElementById('set-password2').value;

  if (password.length < 6) return hint('password-hint', 'Mindestens 6 Zeichen.', 'error');
  if (password !== repeat) return hint('password-hint', 'Die Passwörter stimmen nicht überein.', 'error');

  busy(form, true, 'Ändere …');
  const { error } = await supabase.auth.updateUser({ password });
  busy(form, false, 'Passwort ändern');

  if (error) return hint('password-hint', error.message, 'error');

  form.reset();
  hint('password-hint', 'Passwort geändert.', 'success');
  toast('Passwort geändert.', 'success');
}

// ----------------------------------------------------------------- Sitzung --

async function logoutEverywhere() {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) return hint('session-hint', error.message, 'error');
  toast('Auf allen Geräten abgemeldet.');
}

// -------------------------------------------------------------------- Init --

document.getElementById('email-form').addEventListener('submit', changeEmail);
document.getElementById('password-form').addEventListener('submit', changePassword);
document.getElementById('logout-all').addEventListener('click', logoutEverywhere);
mountIcons();

initAuth({
  onLogin: async (user) => {
    await loadProfile(user);
    document.getElementById('account-meta').textContent =
      `${user.email} · ${roleLabel()} · dabei seit ${fmtDate(user.created_at)}`;
    document.getElementById('set-email').placeholder = user.email ?? '';
    initPasskeyPanel();
    initImageCheck();
  },
});
