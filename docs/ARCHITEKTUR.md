# Architektur – Adressverwaltung

## Überblick

Die Adressverwaltung ist eine **eigenständige Windows-Desktop-App** (Tauri 2).
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
- **`types.ts`** – Datenmodell `Contact` + Hilfsfunktionen.
- **`api.ts`** – dünne Hülle um die Tauri-Befehle (die einzige Stelle mit `invoke`).

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
| Dateiformat | JSON-Umschlag: `version, kdf, salt_b64, nonce_b64, ciphertext_b64` |
| Falsches Passwort | Entschlüsselung schlägt am GCM-Auth-Tag fehl → „Falsches Passwort" |
| Schlüssel im RAM | nur während entsperrter Sitzung; kein Schreiben auf Platte |

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
