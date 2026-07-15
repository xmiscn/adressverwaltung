# Schnittstellen (IPC) – Adressverwaltung

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
| `email`, `telefon`, `mobil` | Kontaktkanäle |
| `geburtstag` | ISO-Datum (`YYYY-MM-DD`) |
| `kategorie` | frei / Vorschläge: Familie, Freunde, Geschäftlich, Sonstige |
| `notizen` | Freitext |
| `erstelltAm`, `geaendertAm` | ISO-Zeitstempel |
