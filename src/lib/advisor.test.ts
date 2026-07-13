import { describe, expect, it } from "vitest";
import {
  buildRecommendations,
  PEA_CEILING,
  type AdvisorInput,
} from "./advisor";

const base: AdvisorInput = {
  netWorth: 20_000,
  emergencyFund: 0,
  monthlyIncome: null,
  monthlyExpenses: null,
  emergencyMonthsTarget: 4,
  hasPEA: true,
  peaInvested: 9_000,
  hasPER: false,
  perDepositsThisYear: 0,
  topPosition: null,
};

const ids = (input: AdvisorInput) =>
  buildRecommendations(input).map((r) => r.id);

describe("buildRecommendations — matelas de sécurité", () => {
  it("invite à compléter le profil quand les dépenses sont absentes", () => {
    expect(ids(base)).toContain("profile-missing");
  });

  it("recommande de renforcer le matelas sous l'objectif (action si < 50 %)", () => {
    const recs = buildRecommendations({
      ...base,
      monthlyExpenses: 1_000,
      emergencyMonthsTarget: 4, // objectif 4 000 €
      emergencyFund: 1_000, // 25 %
    });
    const em = recs.find((r) => r.id === "emergency-fund");
    expect(em).toBeDefined();
    expect(em!.tone).toBe("action");
  });

  it("passe en warning quand le matelas est entre 50 % et 100 %", () => {
    const recs = buildRecommendations({
      ...base,
      monthlyExpenses: 1_000,
      emergencyFund: 3_000, // 75 %
    });
    expect(recs.find((r) => r.id === "emergency-fund")!.tone).toBe("warning");
  });

  it("félicite quand le matelas atteint l'objectif", () => {
    const recs = buildRecommendations({
      ...base,
      monthlyExpenses: 1_000,
      emergencyFund: 4_500,
    });
    const ok = recs.find((r) => r.id === "emergency-fund-ok");
    expect(ok).toBeDefined();
    expect(ok!.tone).toBe("good");
  });
});

describe("buildRecommendations — capacité d'épargne", () => {
  it("oriente l'épargne vers le matelas tant qu'il n'est pas complet", () => {
    const list = ids({
      ...base,
      monthlyIncome: 3_000,
      monthlyExpenses: 2_000,
      emergencyFund: 1_000, // objectif 8 000 € non atteint
    });
    expect(list).toContain("savings-to-emergency");
    expect(list).not.toContain("savings-dca");
  });

  it("recommande le DCA une fois le matelas complet", () => {
    const recs = buildRecommendations({
      ...base,
      monthlyIncome: 3_000,
      monthlyExpenses: 2_000,
      emergencyFund: 8_000, // objectif atteint
    });
    const dca = recs.find((r) => r.id === "savings-dca");
    expect(dca).toBeDefined();
    expect(dca!.tone).toBe("action");
  });

  it("alerte quand les dépenses dépassent les revenus", () => {
    const recs = buildRecommendations({
      ...base,
      monthlyIncome: 1_500,
      monthlyExpenses: 2_000,
    });
    const neg = recs.find((r) => r.id === "negative-capacity");
    expect(neg).toBeDefined();
    expect(neg!.tone).toBe("warning");
  });
});

describe("buildRecommendations — PEA", () => {
  it("ne signale rien loin du plafond", () => {
    expect(ids(base)).not.toContain("pea-near-full");
    expect(ids(base)).not.toContain("pea-full");
  });

  it("prévient à l'approche du plafond (≥ 90 %)", () => {
    expect(ids({ ...base, peaInvested: PEA_CEILING * 0.95 })).toContain(
      "pea-near-full",
    );
  });

  it("signale le plafond atteint", () => {
    const recs = buildRecommendations({ ...base, peaInvested: PEA_CEILING });
    const full = recs.find((r) => r.id === "pea-full");
    expect(full).toBeDefined();
    expect(full!.tone).toBe("warning");
  });
});

describe("buildRecommendations — PER", () => {
  it("indique la marge de déduction quand du plafond reste", () => {
    // plafond = 3000 * 12 * 0,10 = 3 600 €
    const list = ids({
      ...base,
      hasPER: true,
      monthlyIncome: 3_000,
      perDepositsThisYear: 1_000,
    });
    expect(list).toContain("per-margin");
  });

  it("signale le plafond de déduction utilisé", () => {
    const list = ids({
      ...base,
      hasPER: true,
      monthlyIncome: 3_000,
      perDepositsThisYear: 3_600,
    });
    expect(list).toContain("per-ceiling");
  });

  it("ne dit rien sur le PER sans revenus renseignés", () => {
    const list = ids({ ...base, hasPER: true, monthlyIncome: null });
    expect(list).not.toContain("per-margin");
    expect(list).not.toContain("per-ceiling");
  });
});

describe("buildRecommendations — concentration", () => {
  it("signale une ligne trop lourde (> 40 %)", () => {
    const recs = buildRecommendations({
      ...base,
      topPosition: { label: "TotalEnergies", weight: 0.55 },
    });
    const conc = recs.find((r) => r.id === "concentration");
    expect(conc).toBeDefined();
    expect(conc!.tone).toBe("warning");
  });

  it("ne signale rien pour une ligne sous le seuil", () => {
    const list = ids({
      ...base,
      topPosition: { label: "WPEA", weight: 0.3 },
    });
    expect(list).not.toContain("concentration");
  });
});

describe("buildRecommendations — tri", () => {
  it("classe les actions avant les warnings, infos puis good", () => {
    const recs = buildRecommendations({
      ...base,
      monthlyIncome: 3_000,
      monthlyExpenses: 1_000, // capacité 2 000, matelas objectif 4 000
      emergencyFund: 500, // action (< 50 %)
      peaInvested: PEA_CEILING, // warning
      hasPER: true,
      perDepositsThisYear: 5_000, // good (plafond utilisé)
      topPosition: { label: "X", weight: 0.5 }, // warning
    });
    const ranks = { action: 0, warning: 1, info: 2, good: 3 } as const;
    const seq = recs.map((r) => ranks[r.tone]);
    const sorted = [...seq].sort((a, b) => a - b);
    expect(seq).toEqual(sorted);
  });
});
