// Reine Sicht-Logik für die Kontaktliste: Sortierung, Kategorien, Geburtstage.
// Bewusst ohne React/DOM, damit gut per Vitest testbar.

import { Contact, anzeigename } from "./types";

export type SortMode = "name" | "kategorie" | "geaendert";

/** Sortiert Kontakte gemäß Modus (liefert eine neue Liste). */
export function sortContacts(contacts: Contact[], mode: SortMode): Contact[] {
  const liste = [...contacts];
  const nachName = (a: Contact, b: Contact) =>
    anzeigename(a).localeCompare(anzeigename(b), "de", { sensitivity: "base" });

  switch (mode) {
    case "name":
      return liste.sort(nachName);
    case "kategorie":
      return liste.sort((a, b) => {
        // Leere Kategorie ganz nach unten.
        const ka = a.kategorie.trim();
        const kb = b.kategorie.trim();
        if (ka === "" && kb !== "") return 1;
        if (kb === "" && ka !== "") return -1;
        const c = ka.localeCompare(kb, "de", { sensitivity: "base" });
        return c !== 0 ? c : nachName(a, b);
      });
    case "geaendert":
      // Zuletzt geändert zuerst.
      return liste.sort((a, b) => b.geaendertAm.localeCompare(a.geaendertAm));
  }
}

/** Liefert die vorkommenden Kategorien (ohne Leere), alphabetisch. */
export function distinctCategories(contacts: Contact[]): string[] {
  const set = new Set<string>();
  for (const k of contacts) {
    const kat = k.kategorie.trim();
    if (kat) set.add(kat);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));
}

/** Filtert nach Kategorie; leerer Filter ("") liefert alle. */
export function filterByCategory(contacts: Contact[], kategorie: string): Contact[] {
  if (!kategorie) return contacts;
  return contacts.filter((k) => k.kategorie.trim() === kategorie);
}

export interface GeburtstagsEintrag {
  contact: Contact;
  tageBis: number; // 0 = heute
  alter: number; // Alter, das erreicht wird
}

// Parst "YYYY-MM-DD" zu {jahr, monat, tag}; null bei ungültig.
function parseDatum(s: string): { jahr: number; monat: number; tag: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const jahr = Number(m[1]);
  const monat = Number(m[2]);
  const tag = Number(m[3]);
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  return { jahr, monat, tag };
}

/**
 * Liefert die nächsten `anzahl` anstehenden Geburtstage ab `heute`,
 * aufsteigend nach verbleibenden Tagen. Kontakte ohne/ungültiges
 * Geburtsdatum werden ignoriert.
 */
export function naechsteGeburtstage(
  contacts: Contact[],
  anzahl: number,
  heute: Date,
): GeburtstagsEintrag[] {
  const heuteMitternacht = new Date(
    heute.getFullYear(),
    heute.getMonth(),
    heute.getDate(),
  );

  const eintraege: GeburtstagsEintrag[] = [];
  for (const k of contacts) {
    const d = parseDatum(k.geburtstag);
    if (!d) continue;

    let naechster = new Date(heuteMitternacht.getFullYear(), d.monat - 1, d.tag);
    if (naechster.getTime() < heuteMitternacht.getTime()) {
      naechster = new Date(heuteMitternacht.getFullYear() + 1, d.monat - 1, d.tag);
    }
    const tageBis = Math.round(
      (naechster.getTime() - heuteMitternacht.getTime()) / 86_400_000,
    );
    const alter = naechster.getFullYear() - d.jahr;
    eintraege.push({ contact: k, tageBis, alter });
  }

  eintraege.sort((a, b) => a.tageBis - b.tageBis);
  return eintraege.slice(0, anzahl);
}
