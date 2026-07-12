import { describe, expect, it } from "vitest";
import {
  computeAllocation,
  computeCashBalance,
  computeInvested,
  computePositions,
  computeValueSeries,
  downsample,
  type PricePoint,
  type Tx,
} from "./portfolio";

const buy = (
  instrumentId: number,
  date: string,
  quantity: number,
  unitPrice: number,
  fees = 0,
): Tx => ({ instrumentId, type: "BUY", date, quantity, unitPrice, fees, amount: null });

const sell = (
  instrumentId: number,
  date: string,
  quantity: number,
  unitPrice: number,
  fees = 0,
): Tx => ({ instrumentId, type: "SELL", date, quantity, unitPrice, fees, amount: null });

const cashTx = (type: Tx["type"], date: string, amount: number): Tx => ({
  instrumentId: null,
  type,
  date,
  quantity: null,
  unitPrice: null,
  fees: 0,
  amount,
});

const dividend = (instrumentId: number, date: string, amount: number): Tx => ({
  instrumentId,
  type: "DIVIDEND",
  date,
  quantity: null,
  unitPrice: null,
  fees: 0,
  amount,
});

describe("computePositions", () => {
  it("calcule le PRU frais inclus après deux achats", () => {
    const txs = [buy(1, "2026-01-05", 10, 100, 2), buy(1, "2026-02-05", 5, 130, 1)];
    const [pos] = computePositions(txs, new Map([[1, { date: "2026-03-01", close: 140 }]]));
    // coût total = 10×100 + 2 + 5×130 + 1 = 1653 ; PRU = 1653 / 15 = 110,2
    expect(pos.quantity).toBe(15);
    expect(pos.costBasis).toBeCloseTo(1653);
    expect(pos.pru).toBeCloseTo(110.2);
    expect(pos.marketValue).toBeCloseTo(15 * 140);
    expect(pos.unrealizedPnL).toBeCloseTo(2100 - 1653);
  });

  it("réalise la plus-value au PRU sur une vente partielle", () => {
    const txs = [buy(1, "2026-01-05", 10, 100, 0), sell(1, "2026-02-05", 4, 120, 1)];
    const [pos] = computePositions(txs, new Map());
    // réalisé = 4×(120−100) − 1 = 79 ; il reste 6 titres à PRU 100
    expect(pos.realizedPnL).toBeCloseTo(79);
    expect(pos.quantity).toBe(6);
    expect(pos.costBasis).toBeCloseTo(600);
    expect(pos.pru).toBeCloseTo(100);
  });

  it("agrège les dividendes par instrument", () => {
    const txs = [buy(1, "2026-01-05", 10, 50, 0), dividend(1, "2026-03-10", 7.9)];
    const [pos] = computePositions(txs, new Map());
    expect(pos.dividends).toBeCloseTo(7.9);
  });
});

describe("cash et investi", () => {
  it("suit les règles de signe par type de transaction", () => {
    const txs: Tx[] = [
      cashTx("DEPOSIT", "2026-01-02", 500),
      buy(1, "2026-01-05", 4, 100, 2), // −402
      dividend(1, "2026-02-01", 10),
      cashTx("FEE", "2026-02-15", 3),
      sell(1, "2026-03-01", 1, 110, 1), // +109
      cashTx("WITHDRAWAL", "2026-03-10", 50),
    ];
    expect(computeCashBalance(txs)).toBeCloseTo(500 - 402 + 10 - 3 + 109 - 50);
    expect(computeInvested(txs)).toBeCloseTo(450);
  });
});

describe("computeValueSeries", () => {
  it("forward-fille les prix le week-end et suit les versements", () => {
    // Vendredi 2026-01-02 : versement + achat ; prix connus ven. et lun. seulement.
    const txs: Tx[] = [cashTx("DEPOSIT", "2026-01-02", 1000), buy(1, "2026-01-02", 10, 90, 0)];
    const history = new Map<number, PricePoint[]>([
      [1, [{ date: "2026-01-02", close: 92 }, { date: "2026-01-05", close: 95 }]],
    ]);
    const series = computeValueSeries(txs, history, "2026-01-05");
    expect(series).toHaveLength(4); // ven, sam, dim, lun
    expect(series[0]).toMatchObject({ date: "2026-01-02", value: 100 + 920, invested: 1000, cash: 100 });
    expect(series[1].value).toBe(series[0].value); // samedi = cours de vendredi
    expect(series[2].value).toBe(series[0].value);
    expect(series[3].value).toBeCloseTo(100 + 950);
  });

  it("retombe sur le PRU avant la première cotation connue", () => {
    const txs: Tx[] = [cashTx("DEPOSIT", "2026-01-02", 900), buy(1, "2026-01-02", 10, 90, 0)];
    const history = new Map<number, PricePoint[]>([
      [1, [{ date: "2026-01-04", close: 95 }]],
    ]);
    const series = computeValueSeries(txs, history, "2026-01-04");
    expect(series[0].value).toBeCloseTo(900); // valorisé au PRU faute de cours, cash nul
    expect(series[2].value).toBeCloseTo(950);
  });
});

describe("computeAllocation", () => {
  it("inclut les liquidités et somme à 100 %", () => {
    const positions = computePositions(
      [buy(1, "2026-01-02", 10, 90, 0), buy(2, "2026-01-02", 5, 40, 0)],
      new Map([
        [1, { date: "2026-01-10", close: 100 }],
        [2, { date: "2026-01-10", close: 40 }],
      ]),
    );
    const slices = computeAllocation(
      positions,
      300,
      new Map([
        [1, "ETF Monde"],
        [2, "ETF S&P 500"],
      ]),
    );
    expect(slices.map((s) => s.label)).toEqual(["ETF Monde", "ETF S&P 500", "Liquidités"]);
    expect(slices.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(1);
  });
});

describe("downsample", () => {
  it("conserve le dernier point", () => {
    const series = Array.from({ length: 1000 }, (_, i) => ({ i }));
    const out = downsample(series, 400);
    expect(out.length).toBeLessThanOrEqual(401);
    expect(out[out.length - 1]).toBe(series[999]);
  });
});
