// Fenster ohne Konsole starten, sobald es kein Debug-Build mehr ist.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
  Der Schnelleintrag als Windows-Programm.

  Das Fenster zeigt schlicht die Seite quick.html von der gehosteten Adresse –
  Änderungen an der Web-App sind damit sofort auch hier drin, ohne neuen Build.
  Der Rust-Teil kümmert sich nur um das, was eine Webseite nicht kann:

    · ein Tastenkürzel, das systemweit gilt und auch aus dem laufenden Spiel
      heraus greift (Alt+Umschalt+D holt das Fenster nach vorn bzw. weg)
    · das Fenster bleibt über allen anderen liegen
    · Schließen beendet nicht, sondern legt das Programm ins Infofeld der
      Taskleiste, damit das Tastenkürzel weiter funktioniert
*/

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Holt das Fenster nach vorn; ist es schon da, verschwindet es wieder.
fn toggle_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let visible = window.is_visible().unwrap_or(false);
    let focused = window.is_focused().unwrap_or(false);

    if visible && focused {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn show_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    // Alt+Umschalt+D – selten belegt und mit der linken Hand erreichbar.
    let hotkey = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyD);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &hotkey && event.state() == ShortcutState::Pressed {
                        toggle_window(app);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            app.global_shortcut().register(hotkey)?;

            // Infofeld: einziger Weg, das Programm wirklich zu beenden.
            let open = MenuItem::with_id(app, "open", "Schnelleintrag öffnen", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Beenden", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("DBD Stats – Alt+Umschalt+D")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Das Kreuz legt das Fenster nur weg – sonst wäre das Tastenkürzel tot.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Der Schnelleintrag konnte nicht gestartet werden");
}
