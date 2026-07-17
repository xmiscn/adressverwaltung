import { describe, it, expect, beforeEach } from "vitest";
import {
  ladeEinstellungen,
  speichereEinstellungen,
  STANDARD_EINSTELLUNGEN,
  AUTO_LOCK_STANDARD,
} from "./settings";

// Minimaler localStorage-Ersatz für die Testumgebung (Node).
class FakeStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  get length() {
    return this.m.size;
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new FakeStorage() as unknown as Storage;
});

describe("ladeEinstellungen", () => {
  it("liefert ohne gespeicherte Werte die Standardeinstellungen", () => {
    expect(ladeEinstellungen()).toEqual(STANDARD_EINSTELLUNGEN);
  });

  it("liest zuvor gespeicherte Werte wieder ein (Roundtrip)", () => {
    speichereEinstellungen({
      autoLockMinuten: 30,
      telefonGruppiert: false,
      csvTrennzeichen: ",",
      standardSortierung: "kategorie",
    });
    expect(ladeEinstellungen()).toEqual({
      autoLockMinuten: 30,
      telefonGruppiert: false,
      csvTrennzeichen: ",",
      standardSortierung: "kategorie",
    });
  });

  it("faellt bei ungueltiger Auto-Sperre auf den Standard zurueck", () => {
    localStorage.setItem("adr.autoLockMinuten", "keine-zahl");
    expect(ladeEinstellungen().autoLockMinuten).toBe(AUTO_LOCK_STANDARD);
    localStorage.setItem("adr.autoLockMinuten", "-5");
    expect(ladeEinstellungen().autoLockMinuten).toBe(AUTO_LOCK_STANDARD);
  });

  it("erlaubt 0 als Auto-Sperre (aus)", () => {
    localStorage.setItem("adr.autoLockMinuten", "0");
    expect(ladeEinstellungen().autoLockMinuten).toBe(0);
  });

  it("faellt bei unbekanntem Trennzeichen und Sortierung auf den Standard zurueck", () => {
    localStorage.setItem("adr.csvTrennzeichen", "|");
    localStorage.setItem("adr.standardSortierung", "quatsch");
    const e = ladeEinstellungen();
    expect(e.csvTrennzeichen).toBe(";");
    expect(e.standardSortierung).toBe("name");
  });
});
