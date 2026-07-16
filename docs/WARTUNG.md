# Wartungskonzept – ADR-Tresor

## Rollen & Zuständigkeit
- **Betreiber/Nutzer:** regelmäßige Datensicherung, Passwortverwahrung.
- **Entwickler/Wartung:** Abhängigkeiten aktuell halten, Builds erzeugen, Fehler beheben.

## Datensicherung (wichtig!)
Die einzige Nutzdatendatei ist:

```
%APPDATA%\com.adressverwaltung.app\vault.json
```

- **Regelmäßig kopieren** (z. B. wöchentlich auf einen anderen Datenträger/Cloud).
  Die Datei ist verschlüsselt und kann bedenkenlos kopiert werden.
- **Master-Passwort sicher verwahren.** Es gibt **keine** Wiederherstellung.
  Geht das Passwort verloren, sind die Daten unwiederbringlich.

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
