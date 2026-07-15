// Scrollbare Kontaktliste in der Seitenleiste.

import { Contact, anzeigename } from "../types";

interface Props {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ContactList({ contacts, selectedId, onSelect }: Props) {
  if (contacts.length === 0) {
    return <div className="list-leer">Keine Kontakte gefunden.</div>;
  }

  return (
    <ul className="contact-list">
      {contacts.map((k) => {
        const zweitzeile = [k.firma, k.ort].filter(Boolean).join(" · ");
        return (
          <li
            key={k.id}
            className={k.id === selectedId ? "contact-item aktiv" : "contact-item"}
            onClick={() => onSelect(k.id)}
          >
            <div className="ci-name">{anzeigename(k)}</div>
            {zweitzeile && <div className="ci-sub">{zweitzeile}</div>}
          </li>
        );
      })}
    </ul>
  );
}
