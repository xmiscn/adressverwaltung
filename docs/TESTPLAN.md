# Testplan – ADR-Tresor

## 1. Automatisierte Tests

Krypto-/Datenschicht (Rust), im Ordner `src-tauri` ausführen:

```powershell
cargo test
```

Abgedeckt (`src-tauri/src/vault.rs`):
- **Roundtrip + falsches Passwort** – Ver-/Entschlüsseln liefert den Klartext zurück;
  falsches Passwort schlägt fehl.
- **Passwortwechsel** – nach dem Wechsel entsperrt nur das neue Passwort, das alte nicht.
- **Kein Klartext auf Platte** – die gespeicherte Datei enthält den Inhalt nicht im Klartext.

## 2. Manuelle Test-Checkliste (UI)

Vor dem Test ggf. eine bestehende `vault.json` sichern/entfernen
(`%APPDATA%\com.adressverwaltung.app\`), um den Ersteinrichtungs-Fall zu prüfen.

### Ersteinrichtung
- [ ] Erster Start zeigt den Einrichtungs-Bildschirm.
- [ ] Passwort < 4 Zeichen wird abgelehnt.
- [ ] Zwei unterschiedliche Passwörter werden abgelehnt.
- [ ] Gültiges Passwort legt den Tresor an, App öffnet sich (leere Liste).

### Kontakte
- [ ] „+ Neu" öffnet ein leeres Formular.
- [ ] Speichern legt den Kontakt an; er erscheint in der Liste.
- [ ] Auswahl in der Liste zeigt die Detailansicht.
- [ ] „Bearbeiten" → Änderung → „Speichern" übernimmt die Änderung.
- [ ] „Löschen" fragt nach und entfernt den Kontakt.
- [ ] Liste ist alphabetisch sortiert.

### Suche
- [ ] Suche filtert nach Name, Firma, E-Mail, Ort, Kategorie.
- [ ] Leeres Suchfeld zeigt wieder alle Kontakte.

### Persistenz & Verschlüsselung
- [ ] App schließen und neu öffnen → Entsperren-Bildschirm erscheint.
- [ ] Falsches Passwort wird abgelehnt.
- [ ] Richtiges Passwort zeigt alle zuvor angelegten Kontakte.
- [ ] `vault.json` mit Editor öffnen → nur Umschlag (salt/nonce/ciphertext), kein Klartext.

### Passwort ändern
- [ ] „Passwort ändern" mit falschem alten Passwort schlägt fehl.
- [ ] Erfolgreicher Wechsel; nach Neustart entsperrt nur das neue Passwort.

### Sperren
- [ ] „Sperren" führt zurück zum Entsperren-Bildschirm; Daten erst nach Passwort wieder sichtbar.

### Import / Export
- [ ] „Exportieren" → Dateiname `adressen.csv` → Datei enthält alle Kontakte (in Excel prüfbar, Umlaute korrekt).
- [ ] „Exportieren" mit Endung `.vcf` → gültige vCard-Datei (in Kontakte-App/Outlook importierbar).
- [ ] „Importieren" einer zuvor exportierten CSV → Kontakte werden ergänzt (Anzahl stimmt).
- [ ] „Importieren" einer `.vcf` → Kontakte werden ergänzt.
- [ ] Import einer Datei ohne passende Spalten/Karten → Meldung „keine Kontakte gefunden".

## 3. Testprotokoll

| Datum | Version | Tester | Ergebnis | Bemerkung |
|---|---|---|---|---|
|  |  |  |  |  |
