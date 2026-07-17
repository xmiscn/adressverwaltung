// Import/Export von Kontakten als CSV und vCard (3.0).
// Reine Umwandlungsfunktionen ohne Datei-/UI-Bezug.

import { Contact, leererKontakt } from "./types";

// Reihenfolge und deutsche Spaltentitel für den CSV-Export.
const CSV_SPALTEN: { feld: keyof Contact; titel: string }[] = [
  { feld: "anrede", titel: "Anrede" },
  { feld: "vorname", titel: "Vorname" },
  { feld: "nachname", titel: "Nachname" },
  { feld: "firma", titel: "Firma" },
  { feld: "strasse", titel: "Strasse" },
  { feld: "plz", titel: "PLZ" },
  { feld: "ort", titel: "Ort" },
  { feld: "land", titel: "Land" },
  { feld: "website", titel: "Website" },
  { feld: "email", titel: "E-Mail" },
  { feld: "email2", titel: "E-Mail 2" },
  { feld: "telefon", titel: "Telefon" },
  { feld: "mobil", titel: "Mobil" },
  { feld: "geburtstag", titel: "Geburtstag" },
  { feld: "kategorie", titel: "Kategorie" },
  { feld: "notizen", titel: "Notizen" },
];

// Erlaubt tolerantes Zuordnen der Spalten beim Import (Kleinschreibung, Aliase).
const CSV_ALIASE: Record<string, keyof Contact> = {
  anrede: "anrede",
  vorname: "vorname",
  nachname: "nachname",
  name: "nachname",
  firma: "firma",
  unternehmen: "firma",
  strasse: "strasse",
  straße: "strasse",
  "strasse & nr.": "strasse",
  plz: "plz",
  postleitzahl: "plz",
  ort: "ort",
  stadt: "ort",
  land: "land",
  website: "website",
  webseite: "website",
  homepage: "website",
  url: "website",
  email: "email",
  "e-mail": "email",
  mail: "email",
  "email 2": "email2",
  "e-mail 2": "email2",
  email2: "email2",
  telefon: "telefon",
  tel: "telefon",
  mobil: "mobil",
  handy: "mobil",
  geburtstag: "geburtstag",
  geburtsdatum: "geburtstag",
  kategorie: "kategorie",
  gruppe: "kategorie",
  notizen: "notizen",
  notiz: "notizen",
  bemerkung: "notizen",
};

// ---------------------------------------------------------------- CSV Export

function csvFeld(wert: string, delim: string): string {
  if (
    wert.includes(delim) ||
    wert.includes('"') ||
    wert.includes("\n") ||
    wert.includes("\r")
  ) {
    return '"' + wert.replace(/"/g, '""') + '"';
  }
  return wert;
}

export function toCsv(contacts: Contact[], delim: string = ";"): string {
  const kopf = CSV_SPALTEN.map((s) => s.titel).join(delim);
  const zeilen = contacts.map((k) =>
    CSV_SPALTEN.map((s) => csvFeld(k[s.feld] ?? "", delim)).join(delim),
  );
  // BOM voranstellen, damit Excel Umlaute korrekt als UTF-8 liest.
  return "﻿" + [kopf, ...zeilen].join("\r\n");
}

// ---------------------------------------------------------------- CSV Import

// Zerlegt CSV-Text unter Beachtung von Anführungszeichen und Zeilenumbrüchen.
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delim) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function fromCsv(text: string): Contact[] {
  const rein = text.replace(/^﻿/, "");
  const kopfEnde = rein.indexOf("\n");
  const kopfZeile = (kopfEnde >= 0 ? rein.slice(0, kopfEnde) : rein).trim();
  // Trennzeichen erkennen: Semikolon (deutsch) oder Komma.
  const delim = kopfZeile.split(";").length >= kopfZeile.split(",").length ? ";" : ",";

  const zeilen = parseDelimited(rein, delim).filter(
    (z) => z.length > 0 && z.some((f) => f.trim() !== ""),
  );
  if (zeilen.length < 2) return [];

  const kopf = zeilen[0].map((h) => h.trim().toLowerCase());
  const felder: (keyof Contact | null)[] = kopf.map((h) => CSV_ALIASE[h] ?? null);

  return zeilen.slice(1).map((z) => {
    const k = leererKontakt();
    felder.forEach((feld, idx) => {
      if (feld && z[idx] !== undefined) {
        (k[feld] as string) = z[idx].trim();
      }
    });
    return k;
  });
}

// -------------------------------------------------------------- vCard Export

function vEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function vZeile(name: string, wert: string): string {
  return wert ? `${name}:${wert}` : "";
}

export function toVCard(contacts: Contact[]): string {
  return contacts
    .map((k) => {
      const voll = [k.vorname, k.nachname].filter(Boolean).join(" ").trim();
      const zeilen = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        // N: Nachname;Vorname;;Anrede(Prefix);
        `N:${vEscape(k.nachname)};${vEscape(k.vorname)};;${vEscape(k.anrede)};`,
        `FN:${vEscape(voll || k.firma)}`,
        vZeile("ORG", vEscape(k.firma)),
        // ADR: ;;Strasse;Ort;;PLZ;Land
        k.strasse || k.ort || k.plz || k.land
          ? `ADR;TYPE=HOME:;;${vEscape(k.strasse)};${vEscape(k.ort)};;${vEscape(
              k.plz,
            )};${vEscape(k.land)}`
          : "",
        k.website ? `URL:${vEscape(k.website)}` : "",
        k.email ? `EMAIL;TYPE=INTERNET:${vEscape(k.email)}` : "",
        k.email2 ? `EMAIL;TYPE=INTERNET:${vEscape(k.email2)}` : "",
        k.telefon ? `TEL;TYPE=VOICE:${vEscape(k.telefon)}` : "",
        k.mobil ? `TEL;TYPE=CELL:${vEscape(k.mobil)}` : "",
        vZeile("BDAY", k.geburtstag),
        vZeile("CATEGORIES", vEscape(k.kategorie)),
        vZeile("NOTE", vEscape(k.notizen)),
        "END:VCARD",
      ].filter((z) => z !== "");
      return zeilen.join("\r\n");
    })
    .join("\r\n");
}

// -------------------------------------------------------------- vCard Import

function vUnescape(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// Trennt einen strukturierten Wert an nicht-escapten Semikolons.
function splitStruktur(value: string): string[] {
  const teile: string[] = [];
  let akt = "";
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "\\") {
      akt += c + (value[i + 1] ?? "");
      i++;
      continue;
    }
    if (c === ";") {
      teile.push(akt);
      akt = "";
      continue;
    }
    akt += c;
  }
  teile.push(akt);
  return teile;
}

export function fromVCard(text: string): Contact[] {
  // Zeilenfaltung auflösen (Fortsetzungszeilen beginnen mit Space/Tab).
  const entfaltet = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const zeilen = entfaltet.split("\n");

  const kontakte: Contact[] = [];
  let aktuell: Contact | null = null;

  for (const rohzeile of zeilen) {
    const zeile = rohzeile.trim();
    if (zeile === "") continue;
    const oben = zeile.toUpperCase();

    if (oben === "BEGIN:VCARD") {
      aktuell = leererKontakt();
      continue;
    }
    if (oben === "END:VCARD") {
      if (aktuell) kontakte.push(aktuell);
      aktuell = null;
      continue;
    }
    if (!aktuell) continue;

    const doppel = zeile.indexOf(":");
    if (doppel < 0) continue;
    const linkeSeite = zeile.slice(0, doppel);
    const wert = zeile.slice(doppel + 1);
    const teile = linkeSeite.split(";");
    const propName = teile[0].toUpperCase();
    const params = teile.slice(1).join(";").toUpperCase();

    switch (propName) {
      case "N": {
        const komp = splitStruktur(wert).map(vUnescape);
        aktuell.nachname = komp[0] ?? "";
        aktuell.vorname = komp[1] ?? "";
        aktuell.anrede = komp[3] ?? "";
        break;
      }
      case "FN": {
        // Nur als Rückfall, falls kein N-Feld Namen liefert.
        if (!aktuell.vorname && !aktuell.nachname) {
          aktuell.nachname = vUnescape(wert);
        }
        break;
      }
      case "ORG": {
        aktuell.firma = splitStruktur(wert).map(vUnescape)[0] ?? "";
        break;
      }
      case "ADR": {
        const komp = splitStruktur(wert).map(vUnescape);
        // ;;Strasse;Ort;;PLZ;Land
        aktuell.strasse = komp[2] ?? "";
        aktuell.ort = komp[3] ?? "";
        aktuell.plz = komp[5] ?? "";
        aktuell.land = komp[6] ?? "";
        break;
      }
      case "EMAIL": {
        if (!aktuell.email) aktuell.email = vUnescape(wert);
        else if (!aktuell.email2) aktuell.email2 = vUnescape(wert);
        break;
      }
      case "URL": {
        if (!aktuell.website) aktuell.website = vUnescape(wert);
        break;
      }
      case "TEL": {
        if (params.includes("CELL")) {
          aktuell.mobil = vUnescape(wert);
        } else if (!aktuell.telefon) {
          aktuell.telefon = vUnescape(wert);
        }
        break;
      }
      case "BDAY": {
        aktuell.geburtstag = wert.trim();
        break;
      }
      case "CATEGORIES": {
        aktuell.kategorie = vUnescape(wert);
        break;
      }
      case "NOTE": {
        aktuell.notizen = vUnescape(wert);
        break;
      }
    }
  }

  return kontakte;
}
