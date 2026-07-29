# DBD Stats

Kleine Web-App, um eigene **Dead by Daylight**-Matches zu tracken – Login und Datenhaltung über
[Supabase](https://supabase.com), Frontend als statisches HTML/CSS/JS (kein Build-Schritt).

| Seite | Inhalt |
| --- | --- |
| `index.html` | Allgemeine Statistik (Matches, Kill-Rate, Escape-Rate, Blutpunkte), Eingabeformular, letzte Matches, Verteilungen |
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

## 3. Frontend

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

Neue Killer, Survivor oder Spielmodi lassen sich in
[`assets/js/data.js`](assets/js/data.js) ergänzen – gespeichert wird jeweils die `id`.
