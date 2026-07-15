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

/// Speichert die uebergebenen Kontakte (JSON-Text) verschluesselt.
#[tauri::command]
fn save_contacts(data: String, state: State<AppState>) -> Result<(), String> {
    let s = state.0.lock().map_err(|_| "Statusfehler".to_string())?;
    let key = s.key.as_ref().ok_or("Tresor ist gesperrt.")?;
    let salt = s.salt.as_ref().ok_or("Tresor ist gesperrt.")?;
    // Validieren, dass es gueltiges JSON ist, bevor wir es verschluesseln.
    serde_json::from_str::<serde_json::Value>(&data)
        .map_err(|e| format!("Ungueltige Daten: {e}"))?;
    vault::write_encrypted(&s.path, key, salt, &data)
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
            change_password
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
