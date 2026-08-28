// Gemeinsamer Login-Gate für alle Seiten.
import { supabase } from './supabase.js?v=67';
import { mountFeedback, unmountFeedback } from './feedback.js?v=67';
import { passkeyErrorMessage, passkeysSupported, signInWithPasskey } from './passkeys.js?v=67';
import { mountIcons } from './images.js?v=67';
import { clearProfile, loadProfile } from './profile.js?v=67';
import { toast } from './utils.js?v=67';

const AUTH_MARKUP = /* html */ `
  <div class="auth-card">
    <div class="auth-card__brand">
      <span class="auth-card__glyph icon" data-icon="logo"><i class="icon__fallback">&#9788;</i></span>
      <h1>DBD Stats</h1>
      <p>Melde dich an, um deine Trials zu tracken.</p>
    </div>

    <form id="auth-form" class="auth-form" novalidate>
      <div id="passkey-login" hidden>
        <button type="button" class="btn btn--passkey btn--block" id="auth-passkey">
          <span aria-hidden="true">&#128273;</span> Mit Passkey anmelden
        </button>
        <div class="auth-divider"><span>oder mit E-Mail</span></div>
      </div>

      <label class="field">
        <span class="field__label">E-Mail</span>
        <input type="email" id="auth-email" autocomplete="email" required placeholder="du@example.com">
      </label>

      <label class="field">
        <span class="field__label">Passwort</span>
        <input type="password" id="auth-password" autocomplete="current-password"
               minlength="6" required placeholder="Mindestens 6 Zeichen">
      </label>

      <div class="auth-actions">
        <button type="submit" class="btn btn--primary" data-mode="signin">Anmelden</button>
        <button type="button" class="btn btn--ghost" id="auth-signup">Registrieren</button>
      </div>

      <button type="button" class="link-btn" id="auth-magic">Stattdessen Magic-Link per E-Mail</button>
      <p class="auth-hint" id="auth-hint"></p>
    </form>
  </div>
`;

function setBusy(busy) {
  document.querySelectorAll('#auth-form button, #auth-form input')
    .forEach((el) => { el.disabled = busy; });
}

function hint(message, type = 'info') {
  const el = document.getElementById('auth-hint');
  if (!el) return;
  el.textContent = message ?? '';
  el.className = `auth-hint auth-hint--${type}`;
}

function readCredentials() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  return { email, password };
}

function wirePasskeyLogin() {
  if (!passkeysSupported()) return;

  document.getElementById('passkey-login').hidden = false;
  document.getElementById('auth-passkey').addEventListener('click', async () => {
    setBusy(true);
    hint('Passkey wird abgefragt …');

    const error = await signInWithPasskey();
    setBusy(false);
    if (error) hint(passkeyErrorMessage(error), 'error');
  });
}

function wireAuthForm() {
  const form = document.getElementById('auth-form');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { email, password } = readCredentials();
    if (!email || !password) return hint('Bitte E-Mail und Passwort ausfüllen.', 'error');

    setBusy(true);
    hint('Anmeldung läuft …');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) hint(error.message, 'error');
  });

  document.getElementById('auth-signup').addEventListener('click', async () => {
    const { email, password } = readCredentials();
    if (!email || password.length < 6) {
      return hint('E-Mail angeben und ein Passwort mit mindestens 6 Zeichen wählen.', 'error');
    }

    setBusy(true);
    hint('Account wird angelegt …');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);

    if (error) return hint(error.message, 'error');
    if (data.session) return; // Bestätigung deaktiviert -> direkt eingeloggt
    hint('Fast geschafft: Bestätige die E-Mail, die wir dir geschickt haben.', 'success');
  });

  document.getElementById('auth-magic').addEventListener('click', async () => {
    const { email } = readCredentials();
    if (!email) return hint('Bitte zuerst deine E-Mail eintragen.', 'error');

    setBusy(true);
    hint('Magic-Link wird verschickt …');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);
    hint(error ? error.message : 'Link ist unterwegs – schau in dein Postfach.', error ? 'error' : 'success');
  });
}

/**
 * Blendet je nach Session die App oder den Login ein.
 * @param {{onLogin?: (user) => void, onLogout?: () => void}} handlers
 */
export async function initAuth({ onLogin, onLogout } = {}) {
  const authView = document.getElementById('auth-view');
  const appView = document.getElementById('app-view');
  authView.innerHTML = AUTH_MARKUP;
  wireAuthForm();
  wirePasskeyLogin();

  // Das Logo hängt in jeder Kopfzeile – hier eingehängt, damit es auch auf
  // Seiten erscheint, die selbst kein mountIcons() aufrufen.
  mountIcons();

  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      toast('Abgemeldet.');
    });
  });

  let currentUserId = null;

  /* Nur die Besitzerrolle sieht den Einstieg ins Cockpit. Das ist reine
     Kosmetik – abgesichert wird der Zugriff über die RLS-Policies. */
  const applyOwnerNav = async (user) => {
    const profile = await loadProfile(user);
    if (user.id !== currentUserId) return;                 // zwischenzeitlich abgemeldet
    document.querySelectorAll('[data-owner-only]').forEach((el) => { el.hidden = profile?.role !== 'owner'; });
  };

  const apply = (session) => {
    const user = session?.user ?? null;
    if (user) {
      if (user.id === currentUserId) return;
      currentUserId = user.id;
      authView.hidden = true;
      appView.hidden = false;
      document.querySelectorAll('[data-user-email]').forEach((el) => { el.textContent = user.email; });
      document.querySelectorAll('[data-auth-only]').forEach((el) => { el.hidden = false; });
      applyOwnerNav(user);
      mountFeedback(user);
      onLogin?.(user);
    } else {
      currentUserId = null;
      clearProfile();
      authView.hidden = false;
      appView.hidden = true;
      document.querySelectorAll('[data-auth-only]').forEach((el) => { el.hidden = true; });
      document.querySelectorAll('[data-owner-only]').forEach((el) => { el.hidden = true; });
      unmountFeedback();
      onLogout?.();
    }
  };

  supabase.auth.onAuthStateChange((_event, session) => apply(session));

  const { data: { session } } = await supabase.auth.getSession();
  apply(session);
}
