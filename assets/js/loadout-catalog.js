// Was der Import über Ausrüstung gelernt hat, liegt in Supabase – sonst stünde
// bei jedem Neuladen wieder "K25 Power 16" statt des echten Namens da.
//
// Der handgepflegte Katalog in loadout.js bleibt die erste Adresse; hier landet
// nur, was dort noch fehlt. Beides führt loadout.js zusammen.

import { supabase } from './supabase.js?v=61';
import { learnLoadout } from './loadout.js?v=61';
import { toast } from './utils.js?v=61';

/* In der Tabelle heißt die Spalte `grp` – `group` ist in SQL belegt. */
const fromRow = (row) => ({
  kind: row.kind,
  id: row.id,
  name: row.name,
  role: row.role,
  path: row.path,
  group: row.grp,
  killer: row.killer,
});

const toRow = (entry, userId) => ({
  user_id: userId,
  kind: entry.kind,
  id: entry.id,
  name: entry.name,
  role: entry.role,
  path: entry.path ?? null,
  grp: entry.group ?? null,
  killer: entry.killer ?? null,
});

/**
 * Beim Start einmal laden. Schlägt es fehl (etwa weil die Tabelle noch nicht
 * angelegt ist), läuft die App unverändert weiter – dann eben mit den aus der
 * ID abgeleiteten Namen.
 */
export async function loadLoadoutCatalog() {
  const { data, error } = await supabase
    .from('loadout_catalog')
    .select('kind, id, name, role, path, grp, killer');

  /*
    Ohne Tabelle läuft die App weiter, nur eben mit den aus der ID abgeleiteten
    Namen. Das einmal zu sagen ist wichtig: Sonst importiert man, sieht in der
    Vorschau die richtigen Namen und wundert sich, warum nach dem Neuladen
    wieder "K25 Power 16" dasteht.
  */
  if (error) {
    toast(`Gelernte Ausrüstung nicht ladbar: ${error.message}`, 'error');
    return false;
  }

  learnLoadout((data ?? []).map(fromRow));
  return true;
}

/**
 * Nach einem Import sichern. Bereits bekannte IDs werden überschrieben – der
 * Tracker ist die verlässlichere Quelle als ein älterer Stand.
 */
export async function saveLoadoutCatalog(entries, userId) {
  if (!entries?.length || !userId) return;

  learnLoadout(entries);
  const { error } = await supabase
    .from('loadout_catalog')
    .upsert(entries.map((entry) => toRow(entry, userId)), { onConflict: 'user_id,kind,id' });

  // Die Matches sind zu diesem Zeitpunkt schon gespeichert – hier geht nur die
  // Ausrüstungs-Beschriftung verloren. Trotzdem sagen, sonst wundert man sich,
  // warum nach dem Neuladen wieder die IDs dastehen.
  if (error) toast(`Namen der Ausrüstung nicht gesichert: ${error.message}`, 'error');
}
