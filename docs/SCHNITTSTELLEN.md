# Schnittstellen (IPC) – ADR-Tresor

Die einzige Schnittstelle zwischen Frontend und Backend sind die **Tauri-Befehle**.
Das Frontend ruft sie über `invoke("<name>", args)` auf (gekapselt in [`src/api.ts`](../src/api.ts)),
das Backend registriert sie in [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs).

Argument-Namen werden von Tauri automatisch zwischen `camelCase` (JS) und
`snake_case` (Rust) umgesetzt. Jeder Befehl gibt bei Fehlern eine deutsche
Fehlermeldung als `Err(String)` zurück.

---

## `vault_status`
Liefert den Zustand des Tresors. Wird beim App-Start aufgerufen.

- **Argumente:** –
- **Rückgabe:** `{ initialized: boolean, unlocked: boolean }`
  - `initialized` – ob bereits ein Tresor (`vault.json`) existiert
  - `unlocked` – ob die aktuelle Sitzung entsperrt ist (Schlüssel im Speicher)

## `initialize_vault`
Legt einen neuen Tresor an. Schlägt fehl, wenn bereits einer existiert.

- **Argumente:** `password: string` (mind. 4 Zeichen)
- **Rückgabe:** – (Erfolg) / `Err` bei zu kurzem Passwort oder existierendem Tresor
- **Wirkung:** erzeugt Salt, leitet Schlüssel ab, schreibt verschlüsseltes `[]`,
  entsperrt die Sitzung.

## `unlock_vault`
Entsperrt einen bestehenden Tresor.

- **Argumente:** `password: string`
- **Rückgabe:** `string` – die entschlüsselten Kontakte als JSON-Text
- **Fehler:** „Falsches Passwort." wenn die Entschlüsselung fehlschlägt.

## `save_contacts`
Speichert die übergebenen Kontakte verschlüsselt. Setzt eine entsperrte Sitzung voraus.

- **Argumente:** `data: string` – Kontakte als JSON-Text (muss gültiges JSON sein)
- **Rückgabe:** – (Erfolg) / `Err` wenn gesperrt oder JSON ungültig
- **Wirkung:** verschlüsselt mit neuem Nonce und schreibt atomar (temp → rename).

## `lock_vault`
Sperrt die Sitzung: entfernt den Schlüssel aus dem Speicher.

- **Argumente:** –
- **Rückgabe:** – (Erfolg)

## `change_password`
Ändert das Master-Passwort. Prüft das alte Passwort, verschlüsselt mit neuem Salt neu.

- **Argumente:** `oldPassword: string`, `newPassword: string` (neu: mind. 4 Zeichen)
- **Rückgabe:** – (Erfolg) / `Err` bei falschem altem oder zu kurzem neuem Passwort

## `read_text_file`
Liest eine Textdatei ein. Der Pfad stammt aus dem Datei-Dialog (Import CSV/vCard).

- **Argumente:** `path: string`
- **Rückgabe:** `string` – der Dateiinhalt / `Err` bei Lesefehler

## `write_text_file`
Schreibt Text in eine Datei. Der Pfad stammt aus dem Datei-Dialog (Export CSV/vCard).

- **Argumente:** `path: string`, `content: string`
- **Rückgabe:** – (Erfolg) / `Err` bei Schreibfehler

## `vault_path`
Liefert den Speicherort des Tresors (zur Anzeige / als Backup-Vorschlag).

- **Argumente:** –
- **Rückgabe:** `string` – vollständiger Pfad zu `vault.json`

## `backup_vault`
Sichert den **verschlüsselten** Tresor an einen gewählten Ort (reine Dateikopie –
die Sicherung ist genauso geschützt wie das Original).

- **Argumente:** `ziel: string`
- **Rückgabe:** – (Erfolg) / `Err` wenn kein Tresor existiert oder das Schreiben scheitert

## `restore_vault`
Spielt eine Sicherung ein. Prüft zuerst, ob die Datei ein gültiger Tresor-Umschlag ist,
legt den **aktuellen Stand vorher in die rollierende Sicherung**, überschreibt dann
`vault.json` und **sperrt die Sitzung** (die Sicherung kann ein anderes Passwort haben).

- **Argumente:** `quelle: string`
- **Rückgabe:** – (Erfolg) / `Err` bei ungültiger Datei oder Kopierfehler

> Im-/Export selbst (Formatumwandlung) findet im Frontend statt
> ([`src/ioFormats.ts`](../src/ioFormats.ts)); der Datei-Dialog kommt vom
> Plugin `@tauri-apps/plugin-dialog`.

---

## Datenmodell `Contact`

Die über `unlock_vault`/`save_contacts` transportierten Kontakte sind ein JSON-Array
von Objekten mit folgenden Feldern (alle Strings, definiert in [`src/types.ts`](../src/types.ts)):

| Feld | Bedeutung |
|---|---|
| `id` | eindeutige ID (UUID) |
| `anrede` | Herr / Frau / Divers / Firma / (leer) |
| `vorname`, `nachname` | Name |
| `firma` | Firmenname |
| `strasse`, `plz`, `ort`, `land` | Adresse |
| `website` | Webseite (URL) |
| `email`, `email2` | zwei E-Mail-Adressen |
| `telefon`, `mobil` | Telefonnummern, gespeichert als E.164 (`+…`) |
| `geburtstag` | ISO-Datum (`YYYY-MM-DD`) |
| `kategorie` | frei / Vorschläge: Familie, Freunde, Geschäftlich, Sonstige |
| `notizen` | Freitext |
| `erstelltAm`, `geaendertAm` | ISO-Zeitstempel |
