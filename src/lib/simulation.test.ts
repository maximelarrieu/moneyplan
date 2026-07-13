import { describe, expect, it } from "vitest";
import { monthlyRate, project } from "./simulation";

describe("project", () => {
  it("colle à la formule fermée d'une rente à versements constants", () => {
    // V(n) = V0·(1+rM)^n + C·((1+rM)^n − 1)/rM
    const input = { initial: 10_000, monthly: 300, annualReturnPct: 7, years: 20 };
    const rM = monthlyRate(7);
    const n = 240;
    const expected =
      input.initial * Math.pow(1 + rM, n) +
      input.monthly * ((Math.pow(1 + rM, n) - 1) / rM);
    const points = project(input);
    expect(points).toHaveLength(241);
    expect(points[240].value).toBeCloseTo(expected, 0);
    expect(points[240].contributed).toBeCloseTo(10_000 + 300 * 240);
  });

  it("gère un rendement nul", () => {
    const points = project({ initial: 1000, monthly: 100, annualReturnPct: 0, years: 1 });
    expect(points[12].value).toBeCloseTo(2200);
    expect(points[12].contributed).toBeCloseTo(2200);
  });

  it("un DCA augmenté domine le scénario de base", () => {
    const base = project({ initial: 5000, monthly: 300, annualReturnPct: 7, years: 10 });
    const boosted = project({ initial: 5000, monthly: 500, annualReturnPct: 7, years: 10 });
    expect(boosted[120].value).toBeGreaterThan(base[120].value);
  });
});
