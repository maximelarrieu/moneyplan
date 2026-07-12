// Client Yahoo Finance (API chart non officielle, sans clé).
// Le parsing est isolé dans parseChart pour être testable sans réseau.

import type { PricePoint } from "./portfolio";

export interface ChartData {
  closes: PricePoint[];
  latest: PricePoint | null; // cote du jour (regularMarketPrice)
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; regularMarketTime?: number };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
}

export function parseChart(json: unknown): ChartData {
  const body = json as YahooChartResponse;
  const result = body?.chart?.result?.[0];
  if (!result) {
    const desc = body?.chart?.error?.description;
    throw new Error(desc ? `Yahoo: ${desc}` : "Réponse Yahoo invalide");
  }
  const timestamps = result.timestamp ?? [];
  const quoteCloses = result.indicators?.quote?.[0]?.close ?? [];
  const adjCloses = result.indicators?.adjclose?.[0]?.adjclose ?? [];

  const byDate = new Map<string, number>();
  for (let i = 0; i < timestamps.length; i++) {
    const close = quoteCloses[i] ?? adjCloses[i];
    if (close == null || !Number.isFinite(close)) continue;
    // Les timestamps Euronext tombent en journée UTC : la date calendaire UTC est correcte.
    const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    byDate.set(date, close);
  }
  const closes = [...byDate.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let latest: PricePoint | null = null;
  const { regularMarketPrice, regularMarketTime } = result.meta ?? {};
  if (regularMarketPrice != null && regularMarketTime != null) {
    latest = {
      date: new Date(regularMarketTime * 1000).toISOString().slice(0, 10),
      close: regularMarketPrice,
    };
  }
  return { closes, latest };
}

/** Clôtures quotidiennes depuis `fromDate` (YYYY-MM-DD) jusqu'à maintenant. */
export async function fetchDailyCloses(
  symbol: string,
  fromDate: string,
): Promise<ChartData> {
  const period1 = Math.floor(new Date(fromDate + "T00:00:00Z").getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) MoneyPlan/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} pour ${symbol}`);
  return parseChart(await res.json());
}
