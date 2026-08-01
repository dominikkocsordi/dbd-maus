# Schnelleintrag als Windows-Programm

Ein kleines Fenster, das sich mit **Alt + Umschalt + D** aus jeder Lage holen
lässt – auch aus dem laufenden Spiel heraus. Darin steckt die Seite
[`quick.html`](../quick.html) von `dbd.dominikkocsordi.de`; Änderungen an der
Web-App sind damit sofort auch im Programm, ohne dass neu gebaut werden muss.

Was das Fenster kann:

* **Alt + Umschalt + D** holt es nach vorn, nochmal drücken legt es weg
* es bleibt über allen anderen Fenstern liegen
* das Kreuz beendet nicht, sondern legt das Programm ins Infofeld der
  Taskleiste – nur so bleibt das Tastenkürzel am Leben. Beenden geht über
  Rechtsklick auf das Symbol dort.

> **Hinweis:** Diesen Teil konnte ich nicht selbst übersetzen und ausprobieren –
> gebaut wird für Windows, entwickelt wurde auf Linux. Die Weboberfläche
> dahinter ist getestet, der Rahmen hier ist es nicht. Wenn beim Bauen etwas
> klemmt, schick mir die Fehlermeldung.

## Einmalig einrichten

1. **Rust** installieren: <https://rustup.rs> (Standardeinstellungen genügen)
2. **Node.js** installieren: <https://nodejs.org> (LTS)
3. **Visual Studio Build Tools** mit dem Paket „Desktopentwicklung mit C++“:
   <https://visualstudio.microsoft.com/de/visual-cpp-build-tools/>
4. In diesem Ordner einmal `npm install`

Punkt 3 klingt nach viel, ist aber nur der Übersetzer, den Rust unter Windows
braucht. WebView2 ist auf Windows 11 schon dabei.

## Ausprobieren

```
npm run dev
```

Öffnet das Fenster direkt, mit laufendem Nachladen. Zum Beenden das Terminal
schließen.

## Fertiges Programm bauen

```
npm run build
```

Danach liegt das Installationsprogramm unter

```
src-tauri/target/release/bundle/nsis/DBD Stats Schnelleintrag_1.0.0_x64-setup.exe
```

Beim ersten Start meldet sich Windows SmartScreen, weil die Datei nicht
signiert ist: **Weitere Informationen → Trotzdem ausführen**. Das lässt sich nur
mit einem gekauften Signaturzertifikat vermeiden.

## Eigenes Symbol

Die Symbole in `src-tauri/icons/` sind Platzhalter. Mit dem echten Logo:

```
npm run icons -- ..\pfad\zu\dbd_logo.png
```

Der Befehl legt alle nötigen Größen samt `.ico` an. Eine PNG-Datei mit
mindestens 512 × 512 Pixeln funktioniert am besten.

## Etwas ändern

| Was | Wo |
| --- | --- |
| Tastenkürzel | `src-tauri/src/main.rs`, Zeile mit `Code::KeyD` |
| Fenstergröße, „immer oben“ | `src-tauri/tauri.conf.json`, Abschnitt `windows` |
| Adresse der Seite | `src-tauri/tauri.conf.json`, Feld `url` |

Für ein anderes Kürzel, etwa Strg + Alt + Leertaste:

```rust
let hotkey = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::Space);
```

## Ohne Programm auskommen

`quick.html` funktioniert auch einfach im Browser. In Edge oder Chrome über
**⋯ → Apps → Diese Seite als App installieren** bekommt sie ein eigenes Fenster
und ein Symbol in der Taskleiste. Das systemweite Tastenkürzel fehlt dann,
sonst ist es dasselbe.
