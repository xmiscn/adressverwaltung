// Telefonnummern-Validierung/-Formatierung.
// Regel: internationales Format mit führendem "+" ist Pflicht (kein Standardland).
// Speicherung kanonisch als E.164, Anzeige gut lesbar gruppiert.

import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface PhoneResult {
  ok: boolean;
  e164: string; // kanonisch (leer bei leerer Eingabe)
  error?: string;
}

const HINWEIS =
  'Bitte im internationalen Format mit „+" und Landesvorwahl eingeben (z. B. +41 44 123 45 67).';

/** Prüft eine Eingabe. Leer ist erlaubt. Ohne „+" oder ungültig → ok:false. */
export function validatePhone(input: string): PhoneResult {
  const roh = (input ?? "").trim();
  if (roh === "") return { ok: true, e164: "" };
  if (!roh.startsWith("+")) {
    return { ok: false, e164: "", error: HINWEIS };
  }
  const pn = parsePhoneNumberFromString(roh);
  if (!pn || !pn.isValid()) {
    return { ok: false, e164: "", error: "Diese Telefonnummer ist ungültig." };
  }
  return { ok: true, e164: pn.number };
}

/** Formatiert eine (E.164-)Nummer lesbar; gibt bei Unparsbarkeit die Eingabe zurück. */
export function formatPhone(value: string): string {
  const roh = (value ?? "").trim();
  if (roh === "") return "";
  const pn = parsePhoneNumberFromString(roh);
  return pn ? pn.formatInternational() : roh;
}
