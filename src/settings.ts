// Lokale, nicht geheime Einstellungen (im Browser-Speicher der App).
// Enthält bewusst nichts Sensibles – der Tresor bleibt davon unberührt.

const KEY_AUTO_LOCK = "adr.autoLockMinuten";
const KEY_TEL_GRUPPIERT = "adr.telefonGruppiert";
const KEY_CSV_TRENNZEICHEN = "adr.csvTrennzeichen";
const KEY_STANDARD_SORTIERUNG = "adr.standardSortierung";

/** Standard: nach 10 Minuten Inaktivität sperren. */
export const AUTO_LOCK_STANDARD = 10;

/** Erlaubte Werte für die Auto-Sperre; 0 bedeutet "aus". */
export const AUTO_LOCK_OPTIONEN = [0, 5, 10, 15, 30];

export type CsvTrennzeichen = ";" | ",";
export type StandardSortierung = "name" | "kategorie";

export interface Einstellungen {
  autoLockMinuten: number;
  telefonGruppiert: boolean;
  csvTrennzeichen: CsvTrennzeichen;
  standardSortierung: StandardSortierung;
}

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  autoLockMinuten: AUTO_LOCK_STANDARD,
  telefonGruppiert: true,
  csvTrennzeichen: ";",
  standardSortierung: "name",
};

// Zugriff gekapselt: ausserhalb des Browsers (z. B. in Tests) einfach nicht vorhanden.
function speicher(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function lies(key: string): string | null {
  return speicher()?.getItem(key) ?? null;
}

function schreib(key: string, wert: string): void {
  speicher()?.setItem(key, wert);
}

/** Lädt die Einstellungen; unbekannte/ungültige Werte fallen auf den Standard zurück. */
export function ladeEinstellungen(): Einstellungen {
  const rohMinuten = lies(KEY_AUTO_LOCK);
  const minuten = rohMinuten === null ? AUTO_LOCK_STANDARD : Number(rohMinuten);
  const trenn = lies(KEY_CSV_TRENNZEICHEN);
  const sort = lies(KEY_STANDARD_SORTIERUNG);

  return {
    autoLockMinuten:
      Number.isFinite(minuten) && minuten >= 0 ? minuten : AUTO_LOCK_STANDARD,
    // Nur ein ausdrückliches "false" schaltet die Gruppierung ab.
    telefonGruppiert: lies(KEY_TEL_GRUPPIERT) !== "false",
    csvTrennzeichen: trenn === "," ? "," : ";",
    standardSortierung: sort === "kategorie" ? "kategorie" : "name",
  };
}

export function speichereEinstellungen(e: Einstellungen): void {
  schreib(KEY_AUTO_LOCK, String(e.autoLockMinuten));
  schreib(KEY_TEL_GRUPPIERT, String(e.telefonGruppiert));
  schreib(KEY_CSV_TRENNZEICHEN, e.csvTrennzeichen);
  schreib(KEY_STANDARD_SORTIERUNG, e.standardSortierung);
}
