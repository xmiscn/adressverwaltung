// Verschluesselte JSON-Datenhaltung fuer die Adressverwaltung.
//
// Modell:
//   Master-Passwort --Argon2id(salt)--> 256-Bit-Schluessel
//   Kontakte (JSON-Text) --AES-256-GCM(nonce)--> Chiffretext
//
// Auf der Platte liegt nur der "Envelope" (JSON mit salt/nonce/ciphertext).
// Der abgeleitete Schluessel bleibt ausschliesslich im Arbeitsspeicher,
// solange der Tresor entsperrt ist.

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

/// Auf der Platte gespeicherter Umschlag (Klartext-Metadaten + Chiffretext).
#[derive(Serialize, Deserialize)]
struct Envelope {
    version: u32,
    kdf: String,
    salt_b64: String,
    nonce_b64: String,
    ciphertext_b64: String,
}

/// Leitet aus Passwort + Salt einen 256-Bit-Schluessel ab.
fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; KEY_LEN], String> {
    let mut key = [0u8; KEY_LEN];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Schluesselableitung fehlgeschlagen: {e}"))?;
    Ok(key)
}

/// Prueft, ob am angegebenen Pfad bereits ein Tresor existiert.
pub fn exists(path: &PathBuf) -> bool {
    path.exists()
}

/// Legt einen neuen, leeren Tresor an und gibt den abgeleiteten Schluessel
/// sowie das verwendete Salt zurueck (fuer die weitere Sitzung).
pub fn initialize(
    path: &PathBuf,
    password: &str,
    initial_json: &str,
) -> Result<([u8; KEY_LEN], [u8; SALT_LEN]), String> {
    let mut salt = [0u8; SALT_LEN];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    let key = derive_key(password, &salt)?;
    write_encrypted(path, &key, &salt, initial_json)?;
    Ok((key, salt))
}

/// Entsperrt einen bestehenden Tresor: leitet den Schluessel ab, entschluesselt
/// und gibt (Klartext-JSON, Schluessel, Salt) zurueck.
pub fn unlock(
    path: &PathBuf,
    password: &str,
) -> Result<(String, [u8; KEY_LEN], [u8; SALT_LEN]), String> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| format!("Tresor konnte nicht gelesen werden: {e}"))?;
    let env: Envelope =
        serde_json::from_str(&raw).map_err(|e| format!("Tresor-Datei beschaedigt: {e}"))?;

    let salt_vec = B64
        .decode(&env.salt_b64)
        .map_err(|e| format!("Salt beschaedigt: {e}"))?;
    let nonce_vec = B64
        .decode(&env.nonce_b64)
        .map_err(|e| format!("Nonce beschaedigt: {e}"))?;
    let ct = B64
        .decode(&env.ciphertext_b64)
        .map_err(|e| format!("Chiffretext beschaedigt: {e}"))?;

    if salt_vec.len() != SALT_LEN {
        return Err("Salt hat unerwartete Laenge.".into());
    }
    let mut salt = [0u8; SALT_LEN];
    salt.copy_from_slice(&salt_vec);

    let key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
    let nonce = Nonce::from_slice(&nonce_vec);

    // Schlaegt der AEAD-Tag fehl, war das Passwort falsch (oder die Datei manipuliert).
    let plaintext = cipher
        .decrypt(nonce, ct.as_ref())
        .map_err(|_| "Falsches Passwort.".to_string())?;
    let json = String::from_utf8(plaintext)
        .map_err(|e| format!("Entschluesselte Daten sind kein gueltiger Text: {e}"))?;

    Ok((json, key, salt))
}

/// Verschluesselt `json` mit `key`/`salt` und schreibt den Umschlag atomar.
pub fn write_encrypted(
    path: &PathBuf,
    key: &[u8; KEY_LEN],
    salt: &[u8; SALT_LEN],
    json: &str,
) -> Result<(), String> {
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);

    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher
        .encrypt(nonce, json.as_bytes())
        .map_err(|e| format!("Verschluesselung fehlgeschlagen: {e}"))?;

    let env = Envelope {
        version: 1,
        kdf: "argon2id".into(),
        salt_b64: B64.encode(salt),
        nonce_b64: B64.encode(nonce_bytes),
        ciphertext_b64: B64.encode(ct),
    };
    let serialized =
        serde_json::to_string_pretty(&env).map_err(|e| format!("Serialisierung fehlgeschlagen: {e}"))?;

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Zielordner konnte nicht angelegt werden: {e}"))?;
    }

    // Atomar schreiben: erst in temp, dann umbenennen.
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, serialized).map_err(|e| format!("Schreiben fehlgeschlagen: {e}"))?;
    std::fs::rename(&tmp, path).map_err(|e| format!("Umbenennen fehlgeschlagen: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn temp_path(name: &str) -> PathBuf {
        env::temp_dir().join(format!("adressverwaltung_test_{name}.json"))
    }

    #[test]
    fn roundtrip_und_falsches_passwort() {
        let path = temp_path("roundtrip");
        let _ = std::fs::remove_file(&path);

        let daten = r#"[{"vorname":"Max"}]"#;
        initialize(&path, "geheim123", daten).unwrap();
        assert!(exists(&path));

        // Richtiges Passwort -> Klartext zurueck
        let (json, _, _) = unlock(&path, "geheim123").unwrap();
        assert_eq!(json, daten);

        // Falsches Passwort -> Fehler
        assert!(unlock(&path, "falsch").is_err());

        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn passwortwechsel_neu_verschluesseln() {
        let path = temp_path("rekey");
        let _ = std::fs::remove_file(&path);

        let daten = r#"[{"nachname":"Muster"}]"#;
        initialize(&path, "altes_pw", daten).unwrap();

        // Wie change_password: mit altem entsperren, mit neuem re-initialisieren.
        let (json, _, _) = unlock(&path, "altes_pw").unwrap();
        initialize(&path, "neues_pw", &json).unwrap();

        assert!(unlock(&path, "neues_pw").is_ok());
        assert!(unlock(&path, "altes_pw").is_err());

        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn datei_enthaelt_keinen_klartext() {
        let path = temp_path("opaque");
        let _ = std::fs::remove_file(&path);

        let geheim = "GEHEIMER_INHALT_XYZ";
        let daten = format!(r#"[{{"notizen":"{geheim}"}}]"#);
        initialize(&path, "pw12", &daten).unwrap();

        // Die rohe Datei darf den Klartext nicht enthalten, nur den Umschlag.
        let roh = std::fs::read_to_string(&path).unwrap();
        assert!(!roh.contains(geheim), "Klartext in der Datei gefunden!");
        assert!(roh.contains("ciphertext_b64"));

        std::fs::remove_file(&path).unwrap();
    }
}
