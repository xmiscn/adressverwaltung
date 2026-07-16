import { describe, it, expect } from "vitest";
import { validatePhone, formatPhone } from "./phone";

describe("validatePhone", () => {
  it("akzeptiert gültige internationale Nummern und liefert E.164", () => {
    expect(validatePhone("+41 44 668 18 00")).toEqual({
      ok: true,
      e164: "+41446681800",
    });
    expect(validatePhone("+49 151 23456789")).toMatchObject({ ok: true });
  });

  it("erlaubt leere Eingabe", () => {
    expect(validatePhone("")).toEqual({ ok: true, e164: "" });
    expect(validatePhone("   ")).toEqual({ ok: true, e164: "" });
  });

  it("lehnt Nummern ohne führendes + ab", () => {
    const r = validatePhone("044 668 18 00");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("+");
  });

  it("lehnt ungültige Nummern ab", () => {
    expect(validatePhone("+41 1").ok).toBe(false);
    expect(validatePhone("+++").ok).toBe(false);
  });
});

describe("formatPhone", () => {
  it("formatiert E.164 lesbar gruppiert", () => {
    expect(formatPhone("+41446681800")).toBe("+41 44 668 18 00");
  });
  it("gibt leere Eingabe leer zurück", () => {
    expect(formatPhone("")).toBe("");
  });
});
