// Nur-Lesen-Ansicht eines Kontakts mit klickbaren Aktionen und Aktionen (Bearbeiten/Löschen).

import { openUrl } from "@tauri-apps/plugin-opener";
import { Contact, anzeigename } from "../types";
import { formatPhone } from "../phone";

interface Props {
  contact: Contact;
  /** Telefonnummern lesbar gruppiert (+41 44 …) statt kompakt anzeigen. */
  telefonGruppiert: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function oeffne(url: string) {
  openUrl(url).catch(() => {
    /* Öffnen fehlgeschlagen – bewusst still. */
  });
}

// Einfache Textzeile.
function Zeile({ label, wert }: { label: string; wert: string }) {
  if (!wert) return null;
  return (
    <div className="dv-zeile">
      <div className="dv-label">{label}</div>
      <div className="dv-wert">{wert}</div>
    </div>
  );
}

// Klickbare Zeile (E-Mail, Telefon, Website).
function LinkZeile({
  label,
  anzeige,
  url,
}: {
  label: string;
  anzeige: string;
  url: string;
}) {
  if (!anzeige) return null;
  return (
    <div className="dv-zeile">
      <div className="dv-label">{label}</div>
      <div className="dv-wert">
        <button type="button" className="dv-link" onClick={() => oeffne(url)}>
          {anzeige}
        </button>
      </div>
    </div>
  );
}

function websiteUrl(w: string): string {
  return /^https?:\/\//i.test(w) ? w : `https://${w}`;
}

export default function ContactDetail({
  contact,
  telefonGruppiert,
  onEdit,
  onDelete,
}: Props) {
  const k = contact;
  const telAnzeige = (wert: string) => (telefonGruppiert ? formatPhone(wert) : wert);
  const adresseZeilen = [k.strasse, [k.plz, k.ort].filter(Boolean).join(" "), k.land]
    .filter(Boolean)
    .join("\n");
  const kartenQuery = [k.strasse, k.plz, k.ort, k.land].filter(Boolean).join(", ");

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

        {adresseZeilen && (
          <div className="dv-zeile">
            <div className="dv-label">Adresse</div>
            <div className="dv-wert">
              <span style={{ whiteSpace: "pre-line" }}>{adresseZeilen}</span>
              {kartenQuery && (
                <button
                  type="button"
                  className="dv-link dv-klein"
                  onClick={() =>
                    oeffne(
                      "https://www.google.com/maps/search/?api=1&query=" +
                        encodeURIComponent(kartenQuery),
                    )
                  }
                >
                  Auf Karte anzeigen
                </button>
              )}
            </div>
          </div>
        )}

        <LinkZeile label="Website" anzeige={k.website} url={websiteUrl(k.website)} />
        <LinkZeile label="E-Mail" anzeige={k.email} url={`mailto:${k.email}`} />
        <LinkZeile label="E-Mail 2" anzeige={k.email2} url={`mailto:${k.email2}`} />
        <LinkZeile
          label="Telefon"
          anzeige={telAnzeige(k.telefon)}
          url={`tel:${k.telefon}`}
        />
        <LinkZeile label="Mobil" anzeige={telAnzeige(k.mobil)} url={`tel:${k.mobil}`} />
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
