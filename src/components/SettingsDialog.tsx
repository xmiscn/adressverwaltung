// Minikonfiguration: bündelt Tresor-Aktionen, Darstellung und Info an einem Ort.

import { useEffect, useState } from "react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { vaultPath } from "../api";
import {
  Einstellungen,
  AUTO_LOCK_OPTIONEN,
  CsvTrennzeichen,
  StandardSortierung,
} from "../settings";

interface Props {
  einstellungen: Einstellungen;
  onAendern: (e: Einstellungen) => void;
  onClose: () => void;
  onPasswortAendern: () => void;
  onSichern: () => void;
  onWiederherstellen: () => void;
}

export default function SettingsDialog({
  einstellungen,
  onAendern,
  onClose,
  onPasswortAendern,
  onSichern,
  onWiederherstellen,
}: Props) {
  const [pfad, setPfad] = useState("");

  useEffect(() => {
    vaultPath()
      .then(setPfad)
      .catch(() => setPfad("(Speicherort nicht ermittelbar)"));
  }, []);

  function setze<K extends keyof Einstellungen>(feld: K, wert: Einstellungen[K]) {
    onAendern({ ...einstellungen, [feld]: wert });
  }

  return (
    <div className="modal-hintergrund" onClick={onClose}>
      <div className="modal modal-breit" onClick={(e) => e.stopPropagation()}>
        <h2>Einstellungen</h2>

        <section className="einst-block">
          <h3>Tresor</h3>

          <div className="einst-zeile">
            <span className="einst-label">Speicherort</span>
            <div>
              <div className="einst-pfad">{pfad}</div>
              <button
                type="button"
                className="dv-link dv-klein"
                disabled={!pfad}
                onClick={() => {
                  revealItemInDir(pfad).catch(() => {
                    /* Ordner konnte nicht geöffnet werden – bewusst still. */
                  });
                }}
              >
                Ordner öffnen
              </button>
            </div>
          </div>

          <div className="einst-zeile">
            <span className="einst-label">Auto-Sperre</span>
            <select
              value={einstellungen.autoLockMinuten}
              onChange={(e) => setze("autoLockMinuten", Number(e.target.value))}
            >
              {AUTO_LOCK_OPTIONEN.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "aus" : `nach ${m} Minuten`}
                </option>
              ))}
            </select>
          </div>

          <div className="einst-aktionen">
            <button type="button" className="btn-ghost klein" onClick={onPasswortAendern}>
              Master-Passwort ändern
            </button>
            <button type="button" className="btn-ghost klein" onClick={onSichern}>
              Sichern
            </button>
            <button type="button" className="btn-ghost klein" onClick={onWiederherstellen}>
              Wiederherstellen
            </button>
          </div>
        </section>

        <section className="einst-block">
          <h3>Format &amp; Darstellung</h3>

          <div className="einst-zeile">
            <span className="einst-label">Telefon</span>
            <label className="einst-check">
              <input
                type="checkbox"
                checked={einstellungen.telefonGruppiert}
                onChange={(e) => setze("telefonGruppiert", e.target.checked)}
              />
              <span>lesbar gruppiert anzeigen (+41 44 668 18 00)</span>
            </label>
          </div>

          <div className="einst-zeile">
            <span className="einst-label">CSV-Export</span>
            <select
              value={einstellungen.csvTrennzeichen}
              onChange={(e) => setze("csvTrennzeichen", e.target.value as CsvTrennzeichen)}
            >
              <option value=";">Semikolon (Excel, deutsch)</option>
              <option value=",">Komma</option>
            </select>
          </div>

          <div className="einst-zeile">
            <span className="einst-label">Sortierung beim Start</span>
            <select
              value={einstellungen.standardSortierung}
              onChange={(e) =>
                setze("standardSortierung", e.target.value as StandardSortierung)
              }
            >
              <option value="name">Name (A–Z)</option>
              <option value="kategorie">Kategorie</option>
            </select>
          </div>
        </section>

        <section className="einst-block">
          <h3>Info</h3>
          <div className="einst-zeile">
            <span className="einst-label">Version</span>
            <span>ADR-Tresor {__APP_VERSION__}</span>
          </div>
          <p className="einst-warnung">
            Das Master-Passwort kann <strong>nicht</strong> zurückgesetzt werden. Ohne
            Passwort sind die Daten unwiederbringlich verloren – auch aus jeder Sicherung.
          </p>
        </section>

        <div className="modal-aktionen">
          <button type="button" className="btn-primary" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
