# Code-Signing (Windows) – Anleitung

> Status: **vorbereitet, aber nicht aktiv.** Zum Signieren wird ein
> kostenpflichtiges Code-Signing-Zertifikat benötigt (siehe unten).

## Warum signieren?
Eine **unsignierte** `.exe`/Installer zeigt beim Start unter Windows die Warnung
„Der Herausgeber konnte nicht verifiziert werden" bzw. den SmartScreen-Hinweis
„Windows hat Ihren PC geschützt". Eine gültige Signatur:
- weist einen verifizierten Herausgeber aus,
- entfernt die „unbekannter Herausgeber"-Warnung,
- baut (bei EV-Zertifikaten sofort, bei OV mit der Zeit) SmartScreen-Reputation auf.

## Was wird benötigt?
Ein **Code-Signing-Zertifikat** von einer anerkannten Zertifizierungsstelle (CA):

| Typ | Eigenschaft | Hinweis |
|---|---|---|
| **OV** (Organization Validated) | günstiger, als `.pfx`-Datei nutzbar | SmartScreen-Reputation baut sich erst über Downloads auf |
| **EV** (Extended Validation) | teurer, oft auf Hardware-Token/HSM | sofortige SmartScreen-Reputation |

Das Zertifikat ist an eine **Organisation/Person gebunden** und muss käuflich
erworben und validiert werden – das kann nur der Inhaber selbst tun.

## Variante A – Signieren automatisch beim Build (empfohlen)

1. Zertifikat installieren (Doppelklick auf die `.pfx`, in den Zertifikatspeicher
   **„Eigene Zertifikate" / Current User** importieren).
2. Den **Fingerabdruck (Thumbprint)** ermitteln (PowerShell):
   ```powershell
   Get-ChildItem Cert:\CurrentUser\My | Format-List Subject, Thumbprint
   ```
3. In `src-tauri/tauri.conf.json` unter `bundle` den Windows-Block ergänzen:
   ```json
   "bundle": {
     "windows": {
       "certificateThumbprint": "HIER_DEN_THUMBPRINT_EINFUEGEN",
       "digestAlgorithm": "sha256",
       "timestampUrl": "http://timestamp.digicert.com"
     }
   }
   ```
4. Bauen wie gewohnt:
   ```powershell
   npm run tauri build
   ```
   Tauri signiert `.exe`, MSI und NSIS-Setup automatisch.

> Der `timestampUrl` sorgt dafür, dass die Signatur auch nach Ablauf des
> Zertifikats gültig bleibt. Jede seriöse CA nennt eine passende Zeitstempel-URL.

## Variante B – Manuell mit signtool (nachträglich)

Nach `npm run tauri build` die erzeugten Dateien signieren:
```powershell
signtool sign /fd sha256 /f mein-zertifikat.pfx /p PASSWORT `
  /tr http://timestamp.digicert.com /td sha256 `
  "src-tauri\target\release\adressverwaltung.exe"
```
(`signtool.exe` kommt mit dem Windows SDK / den Build Tools.)

## Signatur prüfen
```powershell
signtool verify /pa /v "src-tauri\target\release\adressverwaltung.exe"
```
Oder: Rechtsklick auf die Datei → **Eigenschaften → Digitale Signaturen**.

## Hinweis zu selbstsignierten Zertifikaten
Ein selbst erstelltes Zertifikat kann die App **nur auf Rechnern** ohne Warnung
starten, auf denen dieses Zertifikat vorher als vertrauenswürdig installiert wurde.
Für die Weitergabe an Dritte ist es **nicht** geeignet – dafür ist ein CA-Zertifikat
nötig.
