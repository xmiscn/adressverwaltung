// Nur-Lesen-Ansicht eines Kontakts mit Aktionen (Bearbeiten/Löschen).

import { Contact, anzeigename } from "../types";

interface Props {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}

function Zeile({ label, wert }: { label: string; wert: string }) {
  if (!wert) return null;
  return (
    <div className="dv-zeile">
      <div className="dv-label">{label}</div>
      <div className="dv-wert">{wert}</div>
    </div>
  );
}

export default function ContactDetail({ contact, onEdit, onDelete }: Props) {
  const k = contact;
  const adresse = [k.strasse, [k.plz, k.ort].filter(Boolean).join(" "), k.land]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="detail">
      <div className="detail-kopf">
        <h2>{anzeigename(k)}</h2>
        <div className="detail-aktionen">
          <button type="button" className="btn-danger" onClick={onDelete}>
            Löschen
          </button>
          <button type="button" className="btn-primary" onClick={onEdit}>
            Bearbeiten
          </button>
        </div>
      </div>

      <div className="detail-view">
        <Zeile label="Anrede" wert={k.anrede} />
        <Zeile label="Firma" wert={k.firma} />
        <Zeile label="Kategorie" wert={k.kategorie} />
        {adresse && (
          <div className="dv-zeile">
            <div className="dv-label">Adresse</div>
            <div className="dv-wert" style={{ whiteSpace: "pre-line" }}>
              {adresse}
            </div>
          </div>
        )}
        <Zeile label="E-Mail" wert={k.email} />
        <Zeile label="Telefon" wert={k.telefon} />
        <Zeile label="Mobil" wert={k.mobil} />
        <Zeile label="Geburtstag" wert={k.geburtstag} />
        {k.notizen && (
          <div className="dv-zeile">
            <div className="dv-label">Notizen</div>
            <div className="dv-wert" style={{ whiteSpace: "pre-line" }}>
              {k.notizen}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
