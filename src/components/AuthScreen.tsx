// Einrichtungs- und Entsperrbildschirm (Master-Passwort).

import { FormEvent, useState } from "react";
import { initializeVault, unlockVault } from "../api";

interface Props {
  mode: "setup" | "unlock";
  onUnlocked: (contactsJson: string) => void;
}

export default function AuthScreen({ mode, onUnlocked }: Props) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [fehler, setFehler] = useState("");
  const [busy, setBusy] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setFehler("");

    if (mode === "setup") {
      if (pw.length < 4) {
        setFehler("Das Passwort muss mindestens 4 Zeichen haben.");
        return;
      }
      if (pw !== pw2) {
        setFehler("Die beiden Passwörter stimmen nicht überein.");
        return;
      }
      setBusy(true);
      try {
        await initializeVault(pw);
        onUnlocked("[]");
      } catch (err) {
        setFehler(String(err));
      } finally {
        setBusy(false);
      }
    } else {
      setBusy(true);
      try {
        const json = await unlockVault(pw);
        onUnlocked(json);
      } catch (err) {
        setFehler(String(err));
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={absenden}>
        <div className="auth-logo">ADR-Tresor</div>
        <p className="auth-hint">
          {mode === "setup"
            ? "Vergeben Sie ein Master-Passwort. Damit werden Ihre Adressen verschlüsselt. Ohne dieses Passwort sind die Daten nicht lesbar – es kann nicht zurückgesetzt werden."
            : "Bitte geben Sie Ihr Master-Passwort ein, um die Adressen zu entsperren."}
        </p>

        <label className="feld">
          <span>Master-Passwort</span>
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => setPw(e.target.value)}
            autoComplete={mode === "setup" ? "new-password" : "current-password"}
          />
        </label>

        {mode === "setup" && (
          <label className="feld">
            <span>Passwort bestätigen</span>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        )}

        {fehler && <div className="auth-fehler">{fehler}</div>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy
            ? "Bitte warten…"
            : mode === "setup"
              ? "Tresor anlegen"
              : "Entsperren"}
        </button>
      </form>
    </div>
  );
}
