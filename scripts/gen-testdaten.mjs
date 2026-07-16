// Erzeugt 100 künstliche Testkontakte als CSV (Semikolon, UTF-8 mit BOM),
// importierbar über "Importieren" in ADR-Tresor.
// Aufruf aus dem Projektordner: node scripts/gen-testdaten.mjs
import { mkdirSync, writeFileSync } from "node:fs";

// Kleiner deterministischer PRNG (reproduzierbare Daten).
let seed = 20260716;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const num = (n) =>
  Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");

const vornamen = [
  "Anna", "Lukas", "Sophie", "Jonas", "Lena", "Elias", "Mia", "Noah", "Emma",
  "Ben", "Laura", "Felix", "Sarah", "Tim", "Julia", "Max", "Nina", "Paul",
  "Léa", "Jürgen", "Björn", "Céline", "Fabienne", "Andrea",
];
const nachnamen = [
  "Müller", "Meier", "Schmid", "Keller", "Weber", "Huber", "Schneider",
  "Fischer", "Brunner", "Baumann", "Gerber", "Widmer", "Frei", "Steiner",
  "Graf", "Roth", "Berger", "Lang", "Kaufmann", "Vogel", "Bianchi", "Rossi",
  "Ferrari", "Dubois",
];
const orte = [
  { ort: "Zürich", plz: "8000", land: "Schweiz", cc: "ch" },
  { ort: "Bern", plz: "3000", land: "Schweiz", cc: "ch" },
  { ort: "Basel", plz: "4000", land: "Schweiz", cc: "ch" },
  { ort: "Genf", plz: "1200", land: "Schweiz", cc: "ch" },
  { ort: "Luzern", plz: "6000", land: "Schweiz", cc: "ch" },
  { ort: "St. Gallen", plz: "9000", land: "Schweiz", cc: "ch" },
  { ort: "Berlin", plz: "10115", land: "Deutschland", cc: "de" },
  { ort: "München", plz: "80331", land: "Deutschland", cc: "de" },
  { ort: "Hamburg", plz: "20095", land: "Deutschland", cc: "de" },
  { ort: "Köln", plz: "50667", land: "Deutschland", cc: "de" },
  { ort: "Wien", plz: "1010", land: "Österreich", cc: "at" },
  { ort: "Graz", plz: "8010", land: "Österreich", cc: "at" },
];
const strassen = [
  "Bahnhofstrasse", "Hauptstrasse", "Dorfstrasse", "Lindenweg", "Seestrasse",
  "Kirchgasse", "Bergstrasse", "Gartenweg", "Industriestrasse", "Poststrasse",
];
const firmen = [
  "Muster AG", "Alpina GmbH", "Helvetia Solutions", "TechnoData AG",
  "BlueSky Consulting", "Wintech GmbH", "Seefeld Partner", "NordStern AG",
];
const kategorien = [
  "Familie", "Freunde", "Geschäftlich", "Geschäftlich", "Sonstige", "", "",
];
const notizenPool = [
  "",
  "",
  "Kennengelernt an der Messe, sehr freundlich.",
  "Bevorzugt Kontakt per E-Mail, nicht telefonisch.",
  "Wichtiger Kunde, Rabatt vereinbart.",
  "Alte Schulfreundin, Umzug geplant.",
];
const domains = ["gmail.com", "bluewin.ch", "gmx.de", "web.de", "hotmail.com"];

function telefon(cc) {
  if (cc === "ch") return "+4144" + num(7);
  if (cc === "de") return "+4930" + num(8);
  return "+431" + num(7); // at
}
function mobil(cc) {
  if (cc === "ch") return "+4179" + num(7);
  if (cc === "de") return "+49151" + num(8);
  return "+43664" + num(7); // at
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/é/g, "e")
    .replace(/[^a-z0-9]/g, "");
}

// Geburtstag: einige bewusst nahe "heute" (16.07.2026), damit das Panel gefüllt ist.
function geburtstag(i) {
  if (i < 6) {
    const tag = String(16 + i).padStart(2, "0");
    const jahr = 1960 + Math.floor(rnd() * 45);
    return `${jahr}-07-${tag}`;
  }
  if (rnd() < 0.15) return ""; // ~15 % ohne Geburtstag
  const jahr = 1950 + Math.floor(rnd() * 60);
  const monat = String(1 + Math.floor(rnd() * 12)).padStart(2, "0");
  const tag = String(1 + Math.floor(rnd() * 28)).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

const SPALTEN = [
  "Anrede", "Vorname", "Nachname", "Firma", "Strasse", "PLZ", "Ort", "Land",
  "Website", "E-Mail", "E-Mail 2", "Telefon", "Mobil", "Geburtstag",
  "Kategorie", "Notizen",
];

function feld(v) {
  const s = String(v ?? "");
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const zeilen = [SPALTEN.join(";")];
for (let i = 0; i < 100; i++) {
  const vn = pick(vornamen);
  const nn = pick(nachnamen);
  const o = pick(orte);
  const kat = pick(kategorien);
  const istFirma = kat === "Geschäftlich" || rnd() < 0.15;
  const firma = istFirma ? pick(firmen) : "";
  const anrede = istFirma && rnd() < 0.3 ? "Firma" : pick(["Herr", "Frau", "", "Herr", "Frau"]);
  const domain = pick(domains);
  const email = `${slug(vn)}.${slug(nn)}@${domain}`;
  const email2 = istFirma ? `${slug(vn)[0]}.${slug(nn)}@${slug(firma)}.${o.cc}` : "";
  const website = istFirma ? `https://www.${slug(firma)}.${o.cc}` : "";

  zeilen.push(
    [
      anrede,
      vn,
      nn,
      firma,
      `${pick(strassen)} ${1 + Math.floor(rnd() * 120)}`,
      o.plz,
      o.ort,
      o.land,
      website,
      email,
      email2,
      telefon(o.cc),
      rnd() < 0.7 ? mobil(o.cc) : "",
      geburtstag(i),
      kat,
      pick(notizenPool),
    ]
      .map(feld)
      .join(";"),
  );
}

mkdirSync("testdaten", { recursive: true });
const pfad = "testdaten/adressen-100.csv";
writeFileSync(pfad, "﻿" + zeilen.join("\r\n"), "utf8");
console.log(`${zeilen.length - 1} Testkontakte geschrieben nach ${pfad}`);
