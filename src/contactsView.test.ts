import { describe, it, expect } from "vitest";
import { Contact, leererKontakt } from "./types";
import {
  sortContacts,
  distinctCategories,
  filterByCategory,
  naechsteGeburtstage,
} from "./contactsView";

function k(over: Partial<Contact>): Contact {
  return { ...leererKontakt(), ...over };
}

describe("sortContacts", () => {
  it("sortiert nach Name (A–Z)", () => {
    const liste = [
      k({ vorname: "Bernd", nachname: "Zander" }),
      k({ vorname: "Anna", nachname: "Alpha" }),
      k({ vorname: "Anna", nachname: "Beta" }),
    ];
    const s = sortContacts(liste, "name").map((c) => c.nachname);
    expect(s).toEqual(["Alpha", "Beta", "Zander"]);
  });

  it("sortiert nach Kategorie, Leere zuletzt", () => {
    const liste = [
      k({ nachname: "Ohne", kategorie: "" }),
      k({ nachname: "Zeta", kategorie: "Arbeit" }),
      k({ nachname: "Alpha", kategorie: "Arbeit" }),
      k({ nachname: "Familie1", kategorie: "Familie" }),
    ];
    const s = sortContacts(liste, "kategorie").map((c) => c.nachname);
    // Arbeit (Alpha, Zeta), dann Familie, dann Leere
    expect(s).toEqual(["Alpha", "Zeta", "Familie1", "Ohne"]);
  });

  it("sortiert nach zuletzt geändert (neueste zuerst)", () => {
    const liste = [
      k({ nachname: "Alt", geaendertAm: "2026-01-01T00:00:00.000Z" }),
      k({ nachname: "Neu", geaendertAm: "2026-07-01T00:00:00.000Z" }),
      k({ nachname: "Mittel", geaendertAm: "2026-04-01T00:00:00.000Z" }),
    ];
    const s = sortContacts(liste, "geaendert").map((c) => c.nachname);
    expect(s).toEqual(["Neu", "Mittel", "Alt"]);
  });

  it("verändert die Eingabeliste nicht", () => {
    const liste = [k({ nachname: "B" }), k({ nachname: "A" })];
    sortContacts(liste, "name");
    expect(liste.map((c) => c.nachname)).toEqual(["B", "A"]);
  });
});

describe("distinctCategories", () => {
  it("liefert eindeutige, sortierte Kategorien ohne Leere", () => {
    const liste = [
      k({ kategorie: "Familie" }),
      k({ kategorie: "Arbeit" }),
      k({ kategorie: "Familie" }),
      k({ kategorie: "" }),
      k({ kategorie: "  " }),
    ];
    expect(distinctCategories(liste)).toEqual(["Arbeit", "Familie"]);
  });
});

describe("filterByCategory", () => {
  const liste = [
    k({ nachname: "A", kategorie: "Arbeit" }),
    k({ nachname: "B", kategorie: "Familie" }),
    k({ nachname: "C", kategorie: "Arbeit" }),
  ];
  it("leerer Filter liefert alle", () => {
    expect(filterByCategory(liste, "")).toHaveLength(3);
  });
  it("filtert nach exakter Kategorie", () => {
    expect(filterByCategory(liste, "Arbeit").map((c) => c.nachname)).toEqual([
      "A",
      "C",
    ]);
  });
});

describe("naechsteGeburtstage", () => {
  const heute = new Date(2026, 6, 16); // 16. Juli 2026

  it("sortiert nach verbleibenden Tagen und begrenzt die Anzahl", () => {
    const liste = [
      k({ nachname: "InVierTagen", geburtstag: "1980-07-20" }),
      k({ nachname: "Heute", geburtstag: "1990-07-16" }),
      k({ nachname: "NaechstesJahr", geburtstag: "2000-01-01" }),
      k({ nachname: "OhneDatum", geburtstag: "" }),
      k({ nachname: "Ungueltig", geburtstag: "abc" }),
    ];
    const r = naechsteGeburtstage(liste, 3, heute);
    expect(r.map((e) => e.contact.nachname)).toEqual([
      "Heute",
      "InVierTagen",
      "NaechstesJahr",
    ]);
  });

  it("berechnet Tage und Alter korrekt (heute und kommende)", () => {
    const liste = [
      k({ nachname: "Heute", geburtstag: "1990-07-16" }),
      k({ nachname: "InVierTagen", geburtstag: "1980-07-20" }),
    ];
    const r = naechsteGeburtstage(liste, 5, heute);
    expect(r[0]).toMatchObject({ tageBis: 0, alter: 36 });
    expect(r[1]).toMatchObject({ tageBis: 4, alter: 46 });
  });

  it("schlägt über den Jahreswechsel korrekt auf nächstes Jahr", () => {
    const liste = [k({ nachname: "Silvester", geburtstag: "2000-01-01" })];
    const r = naechsteGeburtstage(liste, 1, heute);
    // Von 16.07.2026 bis 01.01.2027
    expect(r[0].tageBis).toBeGreaterThan(160);
    expect(r[0].alter).toBe(27);
  });

  it("ignoriert Kontakte ohne gültiges Datum", () => {
    const liste = [
      k({ geburtstag: "" }),
      k({ geburtstag: "1.2.1990" }),
      k({ geburtstag: "1990-13-40" }),
    ];
    expect(naechsteGeburtstage(liste, 5, heute)).toHaveLength(0);
  });
});
