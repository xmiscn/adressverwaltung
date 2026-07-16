// Panel "Nächste Geburtstage" für den Startbildschirm.

import { Contact, anzeigename } from "../types";
import { naechsteGeburtstage } from "../contactsView";

interface Props {
  contacts: Contact[];
  onSelect: (id: string) => void;
}

function tageText(tage: number): string {
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}

function tagMonat(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.` : "";
}

export default function BirthdayPanel({ contacts, onSelect }: Props) {
  const eintraege = naechsteGeburtstage(contacts, 3, new Date());
  if (eintraege.length === 0) return null;

  return (
    <div className="gb-panel">
      <h3 className="gb-titel">Nächste Geburtstage</h3>
      <ul className="gb-liste">
        {eintraege.map((e) => (
          <li
            key={e.contact.id}
            className="gb-eintrag"
            onClick={() => onSelect(e.contact.id)}
          >
            <span className="gb-datum">{tagMonat(e.contact.geburtstag)}</span>
            <span className="gb-name">{anzeigename(e.contact)}</span>
            <span className="gb-info">
              wird {e.alter} · {tageText(e.tageBis)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
