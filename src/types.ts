// Datenmodell eines Kontakts. Wird als JSON-Array verschluesselt gespeichert.

export interface Contact {
  id: string;
  anrede: string;
  vorname: string;
  nachname: string;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  email: string;
  telefon: string;
  mobil: string;
  geburtstag: string;
  kategorie: string;
  notizen: string;
  erstelltAm: string;
  geaendertAm: string;
}

export function leererKontakt(): Contact {
  const jetzt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    anrede: "",
    vorname: "",
    nachname: "",
    firma: "",
    strasse: "",
    plz: "",
    ort: "",
    land: "",
    email: "",
    telefon: "",
    mobil: "",
    geburtstag: "",
    kategorie: "",
    notizen: "",
    erstelltAm: jetzt,
    geaendertAm: jetzt,
  };
}

export function anzeigename(k: Contact): string {
  const name = [k.vorname, k.nachname].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (k.firma) return k.firma;
  return "(ohne Namen)";
}
