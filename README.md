# Adressverwaltung

Eine eigenständige Windows-Desktop-App zur Verwaltung von Adressen und Kontakten.
Konservatives Design in Weiß/Blau, vollständig offline, **verschlüsselte** lokale Datenhaltung.

## Merkmale
- **Geschützt:** Zugriff nur mit Master-Passwort; die Daten sind mit AES-256-GCM
  verschlüsselt (Schlüssel via Argon2id).
- **Eigenständig:** native App (Tauri), kein Server, keine Internetverbindung nötig.
- **Einfach:** Kontakte anlegen, bearbeiten, löschen, durchsuchen.

## Technologie
- **Frontend:** React + TypeScript (Vite)
- **Backend/Hülle:** Tauri 2 (Rust)
- **Speicher:** verschlüsselte JSON-Datei in `%APPDATA%\com.adressverwaltung.app\vault.json`

## Voraussetzungen (nur zum Bauen)
- Node.js LTS
- Rust-Toolchain (rustup)
- Visual C++ Build Tools

## Entwicklung starten
```powershell
npm install
npm run tauri dev
```

## Produktionsversion bauen
```powershell
npm run tauri build
```
Ergebnis:
- Programm: `src-tauri/target/release/adressverwaltung.exe`
- Installer: `src-tauri/target/release/bundle/` (MSI und NSIS)

## Tests
```powershell
cd src-tauri
cargo test
```

## Dokumentation
- [Architektur](docs/ARCHITEKTUR.md) – Aufbau, Datenfluss, Sicherheitsmodell
- [Schnittstellen](docs/SCHNITTSTELLEN.md) – IPC-Befehle und Datenmodell
- [Testplan](docs/TESTPLAN.md) – automatisierte Tests + manuelle Checkliste
- [Wartung](docs/WARTUNG.md) – Datensicherung, Updates, neue Versionen

## Wichtiger Hinweis
Das Master-Passwort kann **nicht** zurückgesetzt werden. Ohne Passwort sind die
Daten unwiederbringlich. Bitte das Passwort sicher verwahren und die Datei
`vault.json` regelmäßig sichern (siehe [Wartung](docs/WARTUNG.md)).
