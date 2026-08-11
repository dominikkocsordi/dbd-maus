// Die Supabase-Bibliothek kommt von einem fremden CDN – das ist die einzige
// Stelle der App, die von außerhalb nachgeladen wird, und damit die einzige,
// die die ganze Seite mitreißen kann.
//
// Darum zwei Vorkehrungen:
//
//   1. Feste Version statt Bereich. Bei "^2.105.0" sucht das CDN bei jedem
//      Abruf neu aus, was passt – ein neuer 2.x-Stand kann damit über Nacht
//      etwas anderes ausliefern, ohne dass hier eine Zeile anders steht.
//   2. Ein zweiter Bezugsweg. Ist der erste nicht erreichbar, wird der nächste
//      versucht, statt dass die App gar nicht erst startet.
//
// Passkeys brauchen supabase-js >= 2.105.0 und das experimentelle Opt-in.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js?v=64';

const VERSION = '2.105.0';

const SOURCES = [
  `https://esm.sh/@supabase/supabase-js@${VERSION}`,
  `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${VERSION}/+esm`,
];

/*
  Der Reihe nach, bis eine Quelle liefert. Klappt keine, steht wenigstens eine
  Meldung da, mit der sich etwas anfangen lässt – ohne sie meldet der Browser
  nur, dass irgendein Modul nicht ladbar sei, und zeigt dabei auf die falsche
  Datei.
*/
async function loadCreateClient() {
  for (const url of SOURCES) {
    try {
      const module = await import(url);
      if (module?.createClient) return module.createClient;
    } catch {
      /* Nächste Quelle probieren. */
    }
  }

  throw new Error(
    'Die Supabase-Bibliothek konnte von keinem der Server geladen werden. '
    + 'Meist ist die Verbindung schuld – ein Neuladen in ein paar Minuten hilft.',
  );
}

const createClient = await loadCreateClient();

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: { passkey: true },
  },
});
