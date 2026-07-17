// Tauri-Backend der Adressverwaltung.
// Stellt die Befehle bereit, die das React-Frontend per `invoke` aufruft.

mod vault;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

/// Laufende Sitzung: haelt den entschluesselten Schluessel nur im Speicher.
#[derive(Default)]
struct Session {
    path: PathBuf,
    key: Option<[u8; 32]>,
    salt: Option<[u8; 16]>,
}

struct AppState(Mutex<Session>);

#[derive(serde::Serialize)]
struct StatusDto {
    initialized: bool,
    unlocked: bool,
}

/// Liefert, ob ein Tresor existiert und ob die Sitzung entsperrt ist.
#[tauri::command]
fn vault_status(state: State<AppState>) -> Result<StatusDto, String> {
    let s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    Ok(StatusDto {
        initialized: vault::exists(&s.path),
        unlocked: s.key.is_some(),
    })
}

/// Legt einen neuen Tresor mit dem Master-Passwort an (nur wenn keiner existiert).
#[tauri::command]
fn initialize_vault(password: String, state: State<AppState>) -> Result<(), String> {
    if password.trim().len() < 4 {
        return Err("Das Passwort muss mindestens 4 Zeichen haben.".into());
    }
    let mut s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    if vault::exists(&s.path) {
        return Err("Es existiert bereits ein Tresor.".into());
    }
    let (key, salt) = vault::initialize(&s.path, &password, "[]")?;
    s.key = Some(key);
    s.salt = Some(salt);
    Ok(())
}

/// Entsperrt einen bestehenden Tresor und gibt die Kontakte als JSON-Text zurueck.
#[tauri::command]
fn unlock_vault(password: String, state: State<AppState>) -> Result<String, String> {
    let mut s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    if !vault::exists(&s.path) {
        return Err("Es existiert noch kein Tresor.".into());
    }
    let (json, key, salt) = vault::unlock(&s.path, &password)?;
    s.key = Some(key);
    s.salt = Some(salt);
    Ok(json)
}

/// Liest eine Textdatei ein (Pfad kommt aus dem Datei-Dialog des Nutzers).
/// Wird fuer den Import von CSV/vCard genutzt.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Datei konnte nicht gelesen werden: {e}"))
}

/// Schreibt Text in eine Datei (Pfad kommt aus dem Datei-Dialog des Nutzers).
/// Wird fuer den Export nach CSV/vCard genutzt.
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content)
        .map_err(|e| format!("Datei konnte nicht geschrieben werden: {e}"))
}

/// Speichert die uebergebenen Kontakte (JSON-Text) verschluesselt.
#[tauri::command]
fn save_contacts(data: String, state: State<AppState>) -> Result<(), String> {
    let s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    let key = s.key.as_ref().ok_or("Tresor ist gesperrt.")?;
    let salt = s.salt.as_ref().ok_or("Tresor ist gesperrt.")?;
    // Validieren, dass es gueltiges JSON ist, bevor wir es verschluesseln.
    serde_json::from_str::<serde_json::Value>(&data)
        .map_err(|e| format!("Ungueltige Daten: {e}"))?;
    vault::write_encrypted(&s.path, key, salt, &data)?;

    // Rollierendes Auto-Backup (letzte 5). Ein Fehler hier darf das
    // eigentliche Speichern nicht scheitern lassen.
    if let Some(parent) = s.path.parent() {
        let _ = vault::rotate_backups(&s.path, &parent.join("backups"), 5);
    }
    Ok(())
}

/// Liefert den Speicherort des Tresors (fuer Anzeige/Backup-Vorschlag).
#[tauri::command]
fn vault_path(state: State<AppState>) -> Result<String, String> {
    let s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    Ok(s.path.to_string_lossy().to_string())
}

/// Sichert den verschluesselten Tresor an einen vom Nutzer gewaehlten Ort.
#[tauri::command]
fn backup_vault(ziel: String, state: State<AppState>) -> Result<(), String> {
    let s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    vault::copy_to(&s.path, &PathBuf::from(ziel))
}

/// Spielt eine Sicherung ein. Prueft die Datei, sichert den aktuellen Stand
/// vorher weg und sperrt danach die Sitzung (die Sicherung kann ein anderes
/// Master-Passwort haben).
#[tauri::command]
fn restore_vault(quelle: String, state: State<AppState>) -> Result<(), String> {
    let mut s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    let q = PathBuf::from(quelle);
    if !vault::is_valid_vault_file(&q) {
        return Err("Diese Datei ist keine gueltige ADR-Tresor-Sicherung.".into());
    }
    // Aktuellen Stand vor dem Ueberschreiben in die rollierende Sicherung legen.
    if let Some(parent) = s.path.parent() {
        let _ = vault::rotate_backups(&s.path, &parent.join("backups"), 5);
    }
    vault::copy_to(&q, &s.path)?;
    s.key = None;
    s.salt = None;
    Ok(())
}

/// Sperrt die Sitzung: entfernt den Schluessel aus dem Speicher.
#[tauri::command]
fn lock_vault(state: State<AppState>) -> Result<(), String> {
    let mut s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    s.key = None;
    s.salt = None;
    Ok(())
}

/// Aendert das Master-Passwort: prueft das alte, verschluesselt mit dem neuen neu.
#[tauri::command]
fn change_password(
    old_password: String,
    new_password: String,
    state: State<AppState>,
) -> Result<(), String> {
    if new_password.trim().len() < 4 {
        return Err("Das neue Passwort muss mindestens 4 Zeichen haben.".into());
    }
    let mut s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    // Altes Passwort verifizieren und Klartext holen.
    let (json, _, _) = vault::unlock(&s.path, &old_password)?;
    // Mit neuem Passwort neu verschluesseln (neues Salt) und Daten uebernehmen.
    let (key, salt) = vault::initialize(&s.path, &new_password, &json)?;
    s.key = Some(key);
    s.salt = Some(salt);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Speicherort: %APPDATA%\com.adressverwaltung.app\vault.json
            let dir = app
                .path()
                .app_data_dir()
                .expect("App-Datenordner nicht verfuegbar");
            let path = dir.join("vault.json");
            app.manage(AppState(Mutex::new(Session {
                path,
                key: None,
                salt: None,
            })));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault_status,
            initialize_vault,
            unlock_vault,
            save_contacts,
            lock_vault,
            change_password,
            read_text_file,
            write_text_file,
            vault_path,
            backup_vault,
            restore_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
