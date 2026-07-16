// Formular zum Anlegen/Bearbeiten eines Kontakts.

import { FormEvent, useState } from "react";
import { Contact } from "../types";
import { validatePhone, formatPhone } from "../phone";

interface Props {
  contact: Contact;
  istNeu: boolean;
  onSave: (k: Contact) => void;
  onCancel: () => void;
}

type TelFeld = "telefon" | "mobil";

export default function ContactForm({ contact, istNeu, onSave, onCancel }: Props) {
  const [entwurf, setEntwurf] = useState<Contact>(contact);
  const [telFehler, setTelFehler] = useState<Record<TelFeld, string>>({
    telefon: "",
    mobil: "",
  });

  function setze<K extends keyof Contact>(feld: K, wert: Contact[K]) {
    setEntwurf((e) => ({ ...e, [feld]: wert }));
  }

  // Beim Verlassen eines Telefonfelds: bei Gültigkeit lesbar formatieren, sonst Fehler zeigen.
  function telBlur(feld: TelFeld) {
    const r = validatePhone(entwurf[feld]);
    if (r.ok) {
      setze(feld, formatPhone(r.e164) as Contact[TelFeld]);
      setTelFehler((f) => ({ ...f, [feld]: "" }));
    } else {
      setTelFehler((f) => ({ ...f, [feld]: r.error ?? "Ungültig." }));
    }
  }

  function absenden(e: FormEvent) {
    e.preventDefault();

    // Telefonnummern erzwingen: ungültige blockieren das Speichern.
    const tel = validatePhone(entwurf.telefon);
    const mob = validatePhone(entwurf.mobil);
    if (!tel.ok || !mob.ok) {
      setTelFehler({
        telefon: tel.ok ? "" : (tel.error ?? "Ungültig."),
        mobil: mob.ok ? "" : (mob.error ?? "Ungültig."),
      });
      return;
    }

    onSave({
      ...entwurf,
      telefon: tel.e164,
      mobil: mob.e164,
      geaendertAm: new Date().toISOString(),
    });
  }

  return (
    <form className="detail" onSubmit={absenden}>
      <div className="detail-kopf">
        <h2>{istNeu ? "Neuer Kontakt" : "Kontakt bearbeiten"}</h2>
        <div className="detail-aktionen">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary">
            Speichern
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label className="feld">
          <span>Anrede</span>
          <select value={entwurf.anrede} onChange={(e) => setze("anrede", e.target.value)}>
            <option value="">–</option>
            <option>Herr</option>
            <option>Frau</option>
            <option>Divers</option>
            <option>Firma</option>
          </select>
        </label>
        <label className="feld">
          <span>Kategorie</span>
          <input
            list="kategorien"
            value={entwurf.kategorie}
            onChange={(e) => setze("kategorie", e.target.value)}
          />
          <datalist id="kategorien">
            <option>Familie</option>
            <option>Freunde</option>
            <option>Geschäftlich</option>
            <option>Sonstige</option>
          </datalist>
        </label>

        <label className="feld">
          <span>Vorname</span>
          <input value={entwurf.vorname} onChange={(e) => setze("vorname", e.target.value)} />
        </label>
        <label className="feld">
          <span>Nachname</span>
          <input value={entwurf.nachname} onChange={(e) => setze("nachname", e.target.value)} />
        </label>

        <label className="feld feld-breit">
          <span>Firma</span>
          <input value={entwurf.firma} onChange={(e) => setze("firma", e.target.value)} />
        </label>

        <label className="feld feld-breit">
          <span>Straße &amp; Nr.</span>
          <input value={entwurf.strasse} onChange={(e) => setze("strasse", e.target.value)} />
        </label>

        <label className="feld">
          <span>PLZ</span>
          <input value={entwurf.plz} onChange={(e) => setze("plz", e.target.value)} />
        </label>
        <label className="feld">
          <span>Ort</span>
          <input value={entwurf.ort} onChange={(e) => setze("ort", e.target.value)} />
        </label>

        <label className="feld feld-breit">
          <span>Land</span>
          <input value={entwurf.land} onChange={(e) => setze("land", e.target.value)} />
        </label>

        <label className="feld feld-breit">
          <span>Website</span>
          <input
            type="url"
            placeholder="https://…"
            value={entwurf.website}
            onChange={(e) => setze("website", e.target.value)}
          />
        </label>

        <label className="feld feld-breit">
          <span>E-Mail</span>
          <input
            type="email"
            value={entwurf.email}
            onChange={(e) => setze("email", e.target.value)}
          />
        </label>

        <label className="feld feld-breit">
          <span>E-Mail 2</span>
          <input
            type="email"
            value={entwurf.email2}
            onChange={(e) => setze("email2", e.target.value)}
          />
        </label>

        <label className="feld">
          <span>Telefon</span>
          <input
            value={entwurf.telefon}
            placeholder="+41 …"
            onChange={(e) => setze("telefon", e.target.value)}
            onBlur={() => telBlur("telefon")}
            className={telFehler.telefon ? "feld-fehler" : ""}
          />
          {telFehler.telefon && <small className="feld-hinweis">{telFehler.telefon}</small>}
        </label>
        <label className="feld">
          <span>Mobil</span>
          <input
            value={entwurf.mobil}
            placeholder="+41 …"
            onChange={(e) => setze("mobil", e.target.value)}
            onBlur={() => telBlur("mobil")}
            className={telFehler.mobil ? "feld-fehler" : ""}
          />
          {telFehler.mobil && <small className="feld-hinweis">{telFehler.mobil}</small>}
        </label>

        <label className="feld">
          <span>Geburtstag</span>
          <input
            type="date"
            value={entwurf.geburtstag}
            onChange={(e) => setze("geburtstag", e.target.value)}
          />
        </label>
        <div className="feld" />

        <label className="feld feld-breit">
          <span>Notizen</span>
          <textarea
            rows={4}
            value={entwurf.notizen}
            onChange={(e) => setze("notizen", e.target.value)}
          />
        </label>
      </div>
    </form>
  );
}
