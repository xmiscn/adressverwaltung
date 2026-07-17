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

/// Hinweistext in der Datei: macht beim Oeffnen sofort klar, dass der Inhalt
/// verschluesselt ist und die lesbaren Felder nur technische Metadaten sind.
const HINWEIS: &str = "ADR-Tresor: Die Adressdaten in 'ciphertext_b64' sind mit AES-256-GCM \
verschluesselt (Schluessel via Argon2id aus dem Master-Passwort). Ohne das Master-Passwort \
ist der Inhalt nicht lesbar. 'salt_b64' und 'nonce_b64' sind technisch notwendige, \
nicht geheime Parameter. Diese Datei ist eine gueltige Sicherung.";

/// Auf der Platte gespeicherter Umschlag (Klartext-Metadaten + Chiffretext).
#[derive(Serialize, Deserialize)]
struct Envelope {
    /// Rein informativ; wird beim Lesen ignoriert (aeltere Dateien haben es nicht).
    #[serde(default)]
    hinweis: String,
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
        hinweis: HINWEIS.into(),
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

/// Prueft, ob eine Datei ein gueltiger Tresor-Umschlag ist (ohne Passwort).
/// Dient als Sicherung gegen das Einspielen fremder/kaputter Dateien.
pub fn is_valid_vault_file(path: &PathBuf) -> bool {
    match std::fs::read_to_string(path) {
        Ok(raw) => serde_json::from_str::<Envelope>(&raw).is_ok(),
        Err(_) => false,
    }
}

/// Kopiert den (bereits verschluesselten) Tresor an ein Ziel.
pub fn copy_to(quelle: &PathBuf, ziel: &PathBuf) -> Result<(), String> {
    if !quelle.exists() {
        return Err("Es existiert noch kein Tresor zum Sichern.".into());
    }
    if let Some(parent) = ziel.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Zielordner konnte nicht angelegt werden: {e}"))?;
    }
    std::fs::copy(quelle, ziel).map_err(|e| format!("Sichern fehlgeschlagen: {e}"))?;
    Ok(())
}

/// Rollierende Sicherung: haelt die letzten `keep` Staende.
/// vault-1.json ist die neueste, vault-{keep}.json die aelteste.
pub fn rotate_backups(vault: &PathBuf, dir: &PathBuf, keep: usize) -> Result<(), String> {
    if !vault.exists() || keep == 0 {
        return Ok(());
    }
    std::fs::create_dir_all(dir)
        .map_err(|e| format!("Backup-Ordner konnte nicht angelegt werden: {e}"))?;

    let pfad = |i: usize| dir.join(format!("vault-{i}.json"));

    // Aeltesten Stand entfernen ...
    let aeltester = pfad(keep);
    if aeltester.exists() {
        let _ = std::fs::remove_file(&aeltester);
    }
    // ... dann alle um eins nach hinten schieben (keep-1 -> keep, ..., 1 -> 2).
    for i in (1..keep).rev() {
        let von = pfad(i);
        if von.exists() {
            let _ = std::fs::rename(&von, pfad(i + 1));
        }
    }
    // Aktuellen Stand als neueste Sicherung ablegen.
    std::fs::copy(vault, pfad(1)).map_err(|e| format!("Auto-Backup fehlgeschlagen: {e}"))?;
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

    fn temp_dir_neu(name: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("adressverwaltung_test_{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn backup_ist_gueltig_und_entsperrbar() {
        let dir = temp_dir_neu("backup");
        let vault = dir.join("vault.json");
        let ziel = dir.join("sicherung.json");

        let daten = r#"[{"nachname":"Sicher"}]"#;
        initialize(&vault, "pw12", daten).unwrap();
        copy_to(&vault, &ziel).unwrap();

        assert!(is_valid_vault_file(&ziel));
        // Die Sicherung laesst sich mit demselben Passwort entsperren ...
        let (json, _, _) = unlock(&ziel, "pw12").unwrap();
        assert_eq!(json, daten);
        // ... und bleibt gegen falsche Passwoerter geschuetzt.
        assert!(unlock(&ziel, "falsch").is_err());

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn sichern_ohne_tresor_schlaegt_fehl() {
        let dir = temp_dir_neu("backup_leer");
        let fehlt = dir.join("gibtsnicht.json");
        assert!(copy_to(&fehlt, &dir.join("ziel.json")).is_err());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn fremde_datei_wird_als_ungueltig_erkannt() {
        let dir = temp_dir_neu("valid");
        let muell = dir.join("muell.json");
        std::fs::write(&muell, "kein tresor").unwrap();
        assert!(!is_valid_vault_file(&muell));

        let vault = dir.join("vault.json");
        initialize(&vault, "pw12", "[]").unwrap();
        assert!(is_valid_vault_file(&vault));

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn rotation_haelt_die_letzten_fuenf_staende() {
        let dir = temp_dir_neu("rotation");
        let vault = dir.join("vault.json");
        let backups = dir.join("backups");

        // Sieben Speichervorgaenge simulieren.
        for n in 1..=7 {
            let daten = format!(r#"[{{"nachname":"Stand{n}"}}]"#);
            initialize(&vault, "pw12", &daten).unwrap();
            rotate_backups(&vault, &backups, 5).unwrap();
        }

        // Genau fuenf Sicherungen, keine sechste.
        for i in 1..=5 {
            assert!(
                backups.join(format!("vault-{i}.json")).exists(),
                "vault-{i}.json fehlt"
            );
        }
        assert!(!backups.join("vault-6.json").exists());

        // vault-1 ist der neueste Stand (7), vault-5 der aelteste gehaltene (3).
        let (neueste, _, _) = unlock(&backups.join("vault-1.json"), "pw12").unwrap();
        assert!(neueste.contains("Stand7"), "vault-1 war: {neueste}");
        let (aelteste, _, _) = unlock(&backups.join("vault-5.json"), "pw12").unwrap();
        assert!(aelteste.contains("Stand3"), "vault-5 war: {aelteste}");

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn datei_ohne_hinweisfeld_bleibt_lesbar() {
        // Bestehende Tresore aus aelteren Versionen haben das Feld nicht.
        let dir = temp_dir_neu("kompat");
        let vault = dir.join("vault.json");
        initialize(&vault, "pw12", r#"[{"nachname":"Alt"}]"#).unwrap();

        // Feld entfernen, als kaeme die Datei aus einer aelteren Version.
        let roh = std::fs::read_to_string(&vault).unwrap();
        let mut v: serde_json::Value = serde_json::from_str(&roh).unwrap();
        v.as_object_mut().unwrap().remove("hinweis");
        std::fs::write(&vault, serde_json::to_string_pretty(&v).unwrap()).unwrap();

        let (json, _, _) = unlock(&vault, "pw12").unwrap();
        assert!(json.contains("Alt"));
        assert!(is_valid_vault_file(&vault));

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn neue_datei_enthaelt_erklaerenden_hinweis() {
        let dir = temp_dir_neu("hinweis");
        let vault = dir.join("vault.json");
        initialize(&vault, "pw12", r#"[{"nachname":"Test"}]"#).unwrap();

        let roh = std::fs::read_to_string(&vault).unwrap();
        assert!(roh.contains("verschluesselt"), "Hinweis fehlt in der Datei");
        assert!(roh.contains("AES-256-GCM"));

        std::fs::remove_dir_all(&dir).unwrap();
    }
}
