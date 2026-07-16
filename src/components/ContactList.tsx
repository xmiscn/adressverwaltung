// Scrollbare Kontaktliste, optional nach Kategorie gruppiert.

import { Fragment } from "react";
import { Contact, anzeigename } from "../types";

interface Props {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  groupByCategory?: boolean;
}

export default function ContactList({
  contacts,
  selectedId,
  onSelect,
  groupByCategory,
}: Props) {
  if (contacts.length === 0) {
    return <div className="list-leer">Keine Kontakte gefunden.</div>;
  }

  function eintrag(k: Contact) {
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
  }

  if (!groupByCategory) {
    return <ul className="contact-list">{contacts.map(eintrag)}</ul>;
  }

  // Gruppiert: erwartet, dass die Liste bereits nach Kategorie sortiert ist.
  let letzteKat: string | null = null;
  return (
    <ul className="contact-list">
      {contacts.map((k) => {
        const kat = k.kategorie.trim() || "Ohne Kategorie";
        const kopf = kat !== letzteKat;
        letzteKat = kat;
        return (
          <Fragment key={k.id}>
            {kopf && <li className="contact-gruppe">{kat}</li>}
            {eintrag(k)}
          </Fragment>
        );
      })}
    </ul>
  );
}
