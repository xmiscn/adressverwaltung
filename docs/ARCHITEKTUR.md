# Architektur – ADR-Tresor

## Überblick

ADR-Tresor ist eine **eigenständige Windows-Desktop-App** (Tauri 2).
Sie läuft vollständig offline; es gibt keinen Server und keine Netzwerkverbindung.
Alle Daten liegen verschlüsselt lokal auf dem Rechner.

```
┌─────────────────────────────────────────────┐
│                Tauri-Fenster                 │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │   Frontend  (React + TypeScript)        │ │
│  │   - UI, Kontaktverwaltung im Speicher   │ │
│  └───────────────┬────────────────────────┘ │
│                  │  invoke()  (IPC)          │
│  ┌───────────────▼────────────────────────┐ │
│  │   Backend  (Rust)                       │ │
│  │   - lib.rs : Befehle + Sitzung          │ │
│  │   - vault.rs: Krypto + Datei-IO         │ │
│  └───────────────┬────────────────────────┘ │
└──────────────────┼───────────────────────────┘
                   │
        %APPDATA%\com.adressverwaltung.app\vault.json
        (verschlüsselter Umschlag: Salt, Nonce, Chiffretext)
```

## Schichten

### Frontend (`src/`)
- **`App.tsx`** – zentrale Steuerung: Zustandsautomat mit den Phasen
  `loading → setup | unlock → ready`. Hält die Kontakte nach dem Entsperren
  im Speicher und ruft nach jeder Änderung `save_contacts` auf.
- **`components/AuthScreen.tsx`** – Einrichtung (Passwort vergeben) und Entsperren.
- **`components/ContactList.tsx`** – Liste in der Seitenleiste (gefiltert/sortiert).
- **`components/ContactDetail.tsx`** – Nur-Lesen-Ansicht eines Kontakts.
- **`components/ContactForm.tsx`** – Anlegen/Bearbeiten.
- **`components/BirthdayPanel.tsx`** – „Nächste Geburtstage" auf dem Startbildschirm.
- **`types.ts`** – Datenmodell `Contact` + Hilfsfunktionen.
- **`api.ts`** – dünne Hülle um die Tauri-Befehle (die einzige Stelle mit `invoke`).
- **`contactsView.ts`** – reine, getestete Sicht-Logik: Sortierung, Kategorien, nächste Geburtstage.
- **`phone.ts`** – Telefon-Validierung/-Formatierung via `libphonenumber-js` („+"-Pflicht, Speicherung als E.164).
- **`ioFormats.ts`** – CSV-/vCard-Umwandlung für Im-/Export.
- **`settings.ts`** – lokale, **nicht geheime** Einstellungen im `localStorage`
  (Auto-Sperre, Telefon-Darstellung, CSV-Trennzeichen, Standard-Sortierung).
  Enthält bewusst keine Tresor-Daten; ungültige Werte fallen auf den Standard zurück.
- **`components/SettingsDialog.tsx`** – Minikonfiguration (⚙): Tresor · Format · Info.

Tests: reine Logik-Module (`contactsView`, `phone`) sind mit **Vitest** abgedeckt
(`*.test.ts`), Ausführung über `npm test`.

### Backend (`src-tauri/src/`)
- **`lib.rs`** – definiert die Tauri-Befehle (siehe [SCHNITTSTELLEN.md](SCHNITTSTELLEN.md))
  und verwaltet die **Sitzung** (`Session`): den abgeleiteten Schlüssel + Salt,
  gehalten in einem `Mutex`, nur im Arbeitsspeicher.
- **`vault.rs`** – die Krypto- und Dateischicht (Ver-/Entschlüsseln, atomares Schreiben).

## Datenfluss

1. **Start:** Frontend ruft `vault_status`. Existiert `vault.json` → Entsperren-Bildschirm,
   sonst → Einrichtungs-Bildschirm.
2. **Einrichten:** `initialize_vault(password)` erzeugt zufälliges Salt, leitet den
   Schlüssel ab und schreibt einen leeren, verschlüsselten Tresor (`[]`).
3. **Entsperren:** `unlock_vault(password)` entschlüsselt und gibt das Kontakt-JSON
   zurück. Der Schlüssel bleibt für die Sitzung im Speicher.
4. **Ändern:** Jede Änderung im UI ruft `save_contacts(json)`; das Backend
   verschlüsselt neu und schreibt atomar.
5. **Sperren / App schließen:** `lock_vault` entfernt den Schlüssel aus dem Speicher;
   danach ist erneutes Passwort nötig.

## Sicherheitsmodell

| Aspekt | Umsetzung |
|---|---|
| Schlüsselableitung | **Argon2id** (Standardparameter der `argon2`-Crate) aus Passwort + 16-Byte-Salt |
| Verschlüsselung | **AES-256-GCM** (authentifiziert), 12-Byte-Nonce, neu pro Speichervorgang |
| Speicherort | `%APPDATA%\com.adressverwaltung.app\vault.json` |
| Dateiformat | JSON-Umschlag: `hinweis, version, kdf, salt_b64, nonce_b64, ciphertext_b64` |
| Falsches Passwort | Entschlüsselung schlägt am GCM-Auth-Tag fehl → „Falsches Passwort" |
| Schlüssel im RAM | nur während entsperrter Sitzung; kein Schreiben auf Platte |
| Auto-Sperre | nach Inaktivität (Standard 10 Min) wird der Schlüssel verworfen |

## Datensicherung

- **Rollierendes Auto-Backup:** Bei jedem Speichern wird der Tresor nach
  `%APPDATA%\com.adressverwaltung.app\backups\` kopiert; gehalten werden die
  letzten **5** Stände (`vault-1.json` = neuester … `vault-5.json` = ältester).
  Schlägt das Backup fehl, scheitert das Speichern **nicht** (Best-Effort).
- **Manuelles Backup:** Dateikopie an einen frei gewählten Ort. Da die Datei
  bereits verschlüsselt ist, ist die Sicherung genauso geschützt wie das Original.
- **Wiederherstellen:** Die Datei wird zuerst als gültiger Tresor-Umschlag geprüft,
  der aktuelle Stand wandert in die rollierende Sicherung, danach wird ersetzt und
  die Sitzung gesperrt.

**Warum die Datei „offen" aussieht:** Der Umschlag ist absichtlich lesbares JSON –
`salt` und `nonce` sind technisch nötig, um überhaupt entschlüsseln zu können, und
sind nicht geheim. Die eigentlichen Adressdaten stecken ausschließlich verschlüsselt
in `ciphertext_b64`. Damit das beim Öffnen der Datei niemanden verunsichert, steht ein
erklärender `hinweis` als erstes Feld darin. Das Feld ist rein informativ und wird beim
Lesen ignoriert; ältere Dateien ohne dieses Feld bleiben gültig (per Test abgesichert).

**Klartext gibt es nur beim Export:** `Exportieren` (CSV/vCard) schreibt bewusst
unverschlüsselt, weil Excel/Outlook die Datei lesen müssen. Vor dem Export warnt die
App deutlich, dass die Datei ungeschützt ist und **nicht** als Sicherung taugt –
dafür ist `Sichern` da.

**Bewusste Grenzen (Einzelplatz-Modell):**
- Das Master-Passwort kann **nicht** zurückgesetzt werden – ohne Passwort sind die
  Daten unwiederbringlich (das ist der Zweck der Verschlüsselung).
- Schutz gilt gegen Zugriff auf die ruhende Datei. Gegen Schadsoftware, die den
  laufenden, entsperrten Prozess ausliest, schützt eine lokale App grundsätzlich nicht.

## Wichtige Entscheidungen

- **JSON statt SQLite:** bewusst textbasiert und schlank gehalten; das Kontakt-JSON
  ist das einzige Nutzdatenformat und wird als Ganzes ver-/entschlüsselt. Passend für
  den erwarteten Umfang (bis einige tausend Kontakte).
- **Krypto im Rust-Backend, nicht im Frontend:** Schlüssel und Klartextschlüssel
  verlassen nie das Backend; das Frontend sieht nur entschlüsseltes JSON zur Anzeige.
