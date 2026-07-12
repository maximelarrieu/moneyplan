import { describe, expect, it } from "vitest";
import { parseChart } from "./yahoo";

// Réponse réelle (tronquée) de /v8/finance/chart pour un ETF Euronext.
const fixture = {
  chart: {
    result: [
      {
        meta: {
          currency: "EUR",
          symbol: "WPEA.PA",
          regularMarketPrice: 5.85,
          regularMarketTime: 1767700800, // 2026-01-06 12:00 UTC
        },
        timestamp: [1767427200, 1767513600, 1767686400], // 03/01, 04/01, 06/01 07:00 UTC env.
        indicators: {
          quote: [{ close: [5.71, null, 5.83] }],
          adjclose: [{ adjclose: [5.71, 5.76, 5.83] }],
        },
      },
    ],
    error: null,
  },
};

describe("parseChart", () => {
  it("extrait les clôtures et comble les trous avec adjclose", () => {
    const { closes, latest } = parseChart(fixture);
    expect(closes).toEqual([
      { date: "2026-01-03", close: 5.71 },
      { date: "2026-01-04", close: 5.76 },
      { date: "2026-01-06", close: 5.83 },
    ]);
    expect(latest).toEqual({ date: "2026-01-06", close: 5.85 });
  });

  it("remonte l'erreur Yahoo quand le ticker est inconnu", () => {
    const err = {
      chart: { result: null, error: { code: "Not Found", description: "No data found" } },
    };
    expect(() => parseChart(err)).toThrow(/No data found/);
  });
});
