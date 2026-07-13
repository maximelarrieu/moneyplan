import { describe, expect, it } from "vitest";
import { parseAmount } from "./parse-amount";

describe("parseAmount", () => {
  it("parse un nombre à la française", () => {
    expect(parseAmount("2,49")).toBeCloseTo(2.49);
    expect(parseAmount("3")).toBe(3);
    expect(parseAmount("1 250,50")).toBeCloseTo(1250.5);
  });

  it("additionne les termes séparés par +", () => {
    expect(parseAmount("0,99+1,50")).toBeCloseTo(2.49);
    expect(parseAmount("1 + 1,5")).toBeCloseTo(2.5);
    expect(parseAmount("1+2+3,5")).toBeCloseTo(6.5);
  });

  it("renvoie NaN pour une saisie invalide", () => {
    expect(parseAmount("1+")).toBeNaN();
    expect(parseAmount("+1")).toBeNaN();
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("")).toBeNaN();
    expect(parseAmount("1+abc")).toBeNaN();
  });
});
