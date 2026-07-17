import { describe, it, expect } from "vitest";
import { Contact, leererKontakt } from "./types";
import { toCsv, fromCsv, toVCard, fromVCard } from "./ioFormats";

function k(over: Partial<Contact>): Contact {
  return { ...leererKontakt(), ...over };
}

// Bewusst knifflig: Semikolon, Anfuehrungszeichen, Komma, Zeilenumbruch, Umlaute.
const beispiele: Contact[] = [
  k({
    anrede: "Herr",
    vorname: "Max",
    nachname: "Mustermann",
    firma: "ACME; GmbH",
    strasse: 'Haupt"straße 1',
    plz: "8000",
    ort: "Zürich",
    land: "Schweiz",
    website: "https://www.acme.ch",
    email: "max@acme.ch",
    email2: "m.mustermann@acme.ch",
    telefon: "+41446681800",
    mobil: "+41791234567",
    geburtstag: "1980-05-01",
    kategorie: "Geschäftlich",
    notizen: "Zeile1\nZeile2, mit Komma",
  }),
  k({
    vorname: "Anna",
    nachname: "Schmidt",
    ort: "München",
    email: "anna@web.de",
    kategorie: "Freunde",
  }),
];

const FELDER: (keyof Contact)[] = [
  "anrede", "vorname", "nachname", "firma", "strasse", "plz", "ort", "land",
  "website", "email", "email2", "telefon", "mobil", "geburtstag", "kategorie",
  "notizen",
];

function gleich(a: Contact[], b: Contact[]) {
  expect(b).toHaveLength(a.length);
  a.forEach((orig, i) => {
    FELDER.forEach((f) => {
      expect(b[i][f] ?? "").toBe(orig[f] ?? "");
    });
  });
}

describe("CSV", () => {
  it("Roundtrip mit Semikolon (Standard)", () => {
    gleich(beispiele, fromCsv(toCsv(beispiele)));
  });

  it("Roundtrip mit Komma (Einstellung)", () => {
    const csv = toCsv(beispiele, ",");
    // Kopfzeile muss kommagetrennt sein ...
    expect(csv.split("\r\n")[0]).toContain("Anrede,Vorname,Nachname");
    // ... und der Import erkennt das Trennzeichen selbst.
    gleich(beispiele, fromCsv(csv));
  });

  it("beginnt mit BOM, damit Excel Umlaute korrekt liest", () => {
    expect(toCsv(beispiele).charCodeAt(0)).toBe(0xfeff);
  });

  it("enthaelt die neuen Spalten Website und E-Mail 2", () => {
    const kopf = toCsv(beispiele).split("\r\n")[0];
    expect(kopf).toContain("Website");
    expect(kopf).toContain("E-Mail 2");
  });
});

describe("vCard", () => {
  it("Roundtrip erhaelt alle Felder", () => {
    gleich(beispiele, fromVCard(toVCard(beispiele)));
  });

  it("schreibt Website als URL und zwei EMAIL-Eintraege", () => {
    const vcf = toVCard([beispiele[0]]);
    expect(vcf).toContain("URL:https://www.acme.ch");
    expect(vcf.match(/EMAIL;TYPE=INTERNET:/g)).toHaveLength(2);
  });

  it("maskiert Sonderzeichen korrekt", () => {
    const vcf = toVCard([beispiele[0]]);
    expect(vcf).toContain("ORG:ACME\\; GmbH");
    expect(vcf).toContain("NOTE:Zeile1\\nZeile2\\, mit Komma");
  });
});
