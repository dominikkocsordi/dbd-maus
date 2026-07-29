# DBD Stats

Kleine Web-App, um eigene **Dead by Daylight**-Matches zu tracken – Login und Datenhaltung über
[Supabase](https://supabase.com), Frontend als statisches HTML/CSS/JS (kein Build-Schritt).

| Seite | Inhalt |
| --- | --- |
| `index.html` | Allgemeine Statistik (Matches, Kill-Rate, Escape-Rate, Blutpunkte), Eingabeformular, letzte Matches, Serien, Verteilungen |
| `stats.html` | Detail-Statistik mit Filtern nach Rolle (Killer/Survivor), Charakter, Gamemode und Zeitraum |

## 1. Datenbank einrichten

1. Im Supabase-Dashboard **SQL Editor → New query** öffnen.
2. Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und **Run** klicken.

Das Skript legt an:

* Tabelle `public.matches` inklusive Check-Constraints (Killer ⇒ Kills 0–4, Survivor ⇒ entkommen ja/nein)
* Indizes für die Auswertungen
* **Row Level Security**: jede:r sieht und ändert ausschließlich die eigenen Matches
* Trigger, die `user_id` und `updated_at` automatisch setzen
* View `public.my_stats` mit aggregierten Kennzahlen

Das Skript ist idempotent und kann gefahrlos erneut ausgeführt werden.

## 2. Auth konfigurieren

Unter **Authentication → Providers → Email** sicherstellen, dass „Email“ aktiv ist.

* Mit aktivierter E-Mail-Bestätigung muss der Registrierungslink bestätigt werden.
* Für schnelles Testen kann „Confirm email“ deaktiviert werden – dann ist man nach der
  Registrierung sofort eingeloggt.

Unter **Authentication → URL Configuration** die Adresse der App als *Site URL* bzw.
*Redirect URL* eintragen, z. B. `https://<user>.github.io/dbd-maus/` und `http://localhost:8000`.

## 3. Passkeys (optional, aber empfohlen)

Unter **Authentication → Passkeys** einschalten und die Relying-Party-Daten eintragen.
Für ein Deployment auf GitHub Pages:

| Feld | Wert |
| --- | --- |
| Enable Passkey authentication | an |
| Relying Party Display Name | `DBD Stats` |
| Relying Party ID | `<user>.github.io` – nur die nackte Domain, **ohne** `https://`, Port und Pfad |
| Relying Party Origins | `https://<user>.github.io` |

Regeln dazu:

* Der Hostname jedes Origins muss der Relying Party ID entsprechen oder eine Subdomain davon sein.
  `localhost` und `<user>.github.io` lassen sich deshalb **nicht gleichzeitig** eintragen.
* Für lokale Tests stattdessen RP ID `localhost` und Origin `http://localhost:8000` (der Port muss zum
  eigenen Webserver passen). HTTPS ist Pflicht, außer bei `localhost`/`127.0.0.1`.
* **Die RP ID nachträglich zu ändern macht alle bereits registrierten Passkeys unbrauchbar** – also
  vor dem ersten Registrieren festlegen.

Im Frontend ist die experimentelle Passkey-Option bereits aktiviert
(`auth.experimental.passkey` in `assets/js/supabase.js`, benötigt `@supabase/supabase-js` ≥ 2.105.0).

Ablauf in der App: einmalig per E-Mail anmelden → auf der Übersicht im Panel **Passkeys** einen
Passkey anlegen → danach genügt auf der Login-Karte der Button **Mit Passkey anmelden** (ohne
E-Mail-Eingabe, der Authenticator wählt den Account selbst). Passkeys lassen sich dort auch
umbenennen und entfernen. Ein Passkey setzt einen bestätigten, nicht-anonymen Account voraus.

## 4. Frontend

Die Zugangsdaten stehen in [`assets/js/config.js`](assets/js/config.js):

```js
export const SUPABASE_URL = 'https://<projekt>.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_…';
```

Der Publishable Key ist für den Browser gedacht und darf öffentlich sein – der Schutz der Daten
läuft über Row Level Security. Ein `service_role`-Key gehört **niemals** ins Frontend.

### Lokal starten

Die Seiten nutzen ES-Module, also über einen kleinen Webserver öffnen (nicht per `file://`):

```bash
python3 -m http.server 8000
# http://localhost:8000
```

### Auf GitHub Pages veröffentlichen

**Settings → Pages → Source: Deploy from a branch**, Branch auswählen, Ordner `/ (root)`.

## Datenmodell

| Spalte | Typ | Bedeutung |
| --- | --- | --- |
| `played_at` | `timestamptz` | Zeitpunkt des Matches |
| `role` | `text` | `killer` oder `survivor` |
| `game_mode` | `text` | `public`, `2v8`, `chaos_shuffle`, `event`, `custom`, `other` |
| `killer` | `text` | Killer-ID (nur bei `role = killer`) |
| `kills` | `smallint` | 0–4 (nur bei `role = killer`) |
| `survivor` | `text` | Survivor-ID (nur bei `role = survivor`) |
| `escaped` | `boolean` | entkommen ja/nein (nur bei `role = survivor`) |
| `bloodpoints` | `integer` | 0 – 2.000.000 |
| `notes` | `text` | optionale Notiz (max. 500 Zeichen) |

## Einträge bearbeiten

In der Liste **Letzte Matches** öffnet das Stift-Symbol den Eintrag im Formular; der Panel-Titel
wechselt auf „Match bearbeiten“, **Bearbeiten abbrechen** verwirft die Änderung. Auch die Rolle lässt
sich umstellen – die Felder der anderen Rolle werden dabei geleert, damit der Check-Constraint der
Tabelle passt. In der Detail-Statistik führt das Stift-Symbol über `index.html?edit=<id>` auf dasselbe
Formular, sodass sich auch ältere Matches bearbeiten lassen.

## Serien (Streaks)

Pro Charakter werden zwei Werte berechnet – auf der Übersicht im Panel **Serien**, in der
Detail-Statistik als Spalten *Serie* und *Beste Serie*:

* **Survivor**: Escapes am Stück mit demselben Survivor. Ein Tod beendet die Serie.
* **Killer**: Matches am Stück mit mindestens 3 Kills. Bei 2K oder weniger ist die Serie weg.

Die Schwelle für Killer steht als `KILLER_STREAK_MIN_KILLS` in
[`assets/js/utils.js`](assets/js/utils.js).

`Serie` ist die aktuell laufende Serie (ab dem neuesten Match rückwärts), `Beste Serie` die längste
je erreichte. In der Detail-Statistik beziehen sich beide Werte auf die gefilterte Auswahl.

Neue Killer, Survivor oder Spielmodi lassen sich in
[`assets/js/data.js`](assets/js/data.js) ergänzen – gespeichert wird jeweils die `id`.
