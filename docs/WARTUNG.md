# Wartungskonzept – ADR-Tresor

## Rollen & Zuständigkeit
- **Betreiber/Nutzer:** regelmäßige Datensicherung, Passwortverwahrung.
- **Entwickler/Wartung:** Abhängigkeiten aktuell halten, Builds erzeugen, Fehler beheben.

## Datensicherung (wichtig!)
Die einzige Nutzdatendatei ist:

```
%APPDATA%\com.adressverwaltung.app\vault.json
```

**Automatisch (seit 0.4.0):** Bei jedem Speichern legt die App eine rollierende
Sicherung der letzten **5** Stände unter
`%APPDATA%\com.adressverwaltung.app\backups\` ab (`vault-1.json` = neuester).
Das schützt gegen versehentliches Überschreiben – **nicht** gegen Festplattenausfall.

**Manuell (empfohlen, zusätzlich):**
- In der App auf **„Sichern"** klicken und die Datei auf einen **anderen
  Datenträger / in die Cloud** legen (z. B. wöchentlich). Die Sicherung ist
  verschlüsselt und kann bedenkenlos abgelegt werden.
- Einspielen über **„Wiederherstellen"**; danach ist das Passwort der Sicherung nötig.

**Master-Passwort sicher verwahren.** Es gibt **keine** Wiederherstellung.
Geht das Passwort verloren, sind die Daten unwiederbringlich – auch aus jedem Backup.

## Abhängigkeiten aktuell halten
Empfehlung: quartalsweise prüfen.

**Frontend (npm):**
```powershell
npm outdated        # zeigt veraltete Pakete
npm update          # aktualisiert im erlaubten Versionsrahmen
npm audit           # bekannte Sicherheitslücken
```

**Backend (Rust/Cargo):**
```powershell
cd src-tauri
cargo update        # aktualisiert Crate-Versionen (Cargo.lock)
cargo audit         # optional: cargo install cargo-audit
```

Sicherheitsrelevant sind besonders die Krypto-Crates `argon2`, `aes-gcm`, `rand`
sowie `tauri` selbst. Nach Updates immer `cargo test` + manuellen Testplan laufen lassen.

## Toolchain aktualisieren
```powershell
rustup update       # Rust-Compiler
winget upgrade OpenJS.NodeJS.LTS
```

## Neue Version bauen & veröffentlichen
1. Version erhöhen in **beiden** Dateien:
   - `package.json` → `"version"`
   - `src-tauri/tauri.conf.json` → `"version"`
   - (optional) `src-tauri/Cargo.toml` → `version`
2. Tests: `cargo test` und Testplan durchgehen.
3. Bauen: `npm run tauri build`
4. Ergebnis liegt unter
   `src-tauri/target/release/adressverwaltung.exe` (Programm) und
   `src-tauri/target/release/bundle/` (Installer: MSI/NSIS).
5. Änderungen committen und taggen (`git tag vX.Y.Z`).

## Fehlerbehebung
| Symptom | Ursache / Abhilfe |
|---|---|
| `node`/`cargo` „not found" in neuer Shell | PATH noch nicht übernommen → neue Shell/Reboot |
| Build-Fehler beim Linken (`link.exe`) | Visual C++ Build Tools fehlen/reparieren |
| „Falsches Passwort" trotz richtigem Passwort | ggf. beschädigte/ersetzte `vault.json` → aus Backup wiederherstellen |
| App startet nicht nach Update | `cargo clean` in `src-tauri`, dann neu bauen |

## Änderungshistorie
| Version | Datum | Änderung |
|---|---|---|
| 0.1.0 | 2026-07-15 | Erstversion: verschlüsselte Kontaktverwaltung |
| 0.2.0 | 2026-07-15 | Import/Export (CSV/vCard), eigenes App-Icon, Code-Signing-Anleitung |
| 0.3.0 | 2026-07-16 | Umbenennung ADR-Tresor; Sortieren/Gruppieren/Kategorie-Filter; nächste Geburtstage; Website + 2. E-Mail; klickbare Aktionen; Telefon-Pflichtformat; Übersicht-Button |
| 0.4.0 | 2026-07-16 | Auto-Sperre bei Inaktivität; manuelles Sichern/Wiederherstellen; rollierendes Auto-Backup (letzte 5); selbsterklärender Hinweis in der Tresordatei; Warnung vor unverschlüsseltem Export |
