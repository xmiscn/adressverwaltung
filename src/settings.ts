// Lokale, nicht geheime Einstellungen (im Browser-Speicher der App).
// Enthält bewusst nichts Sensibles – der Tresor bleibt davon unberührt.

const KEY_AUTO_LOCK = "adr.autoLockMinuten";

/** Standard: nach 10 Minuten Inaktivität sperren. */
export const AUTO_LOCK_STANDARD = 10;

/** Erlaubte Werte; 0 bedeutet "aus". */
export const AUTO_LOCK_OPTIONEN = [0, 5, 10, 15, 30];

export function getAutoLockMinuten(): number {
  const roh = localStorage.getItem(KEY_AUTO_LOCK);
  if (roh === null) return AUTO_LOCK_STANDARD;
  const v = Number(roh);
  return Number.isFinite(v) && v >= 0 ? v : AUTO_LOCK_STANDARD;
}

export function setAutoLockMinuten(minuten: number): void {
  localStorage.setItem(KEY_AUTO_LOCK, String(minuten));
}
