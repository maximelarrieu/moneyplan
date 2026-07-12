// Synchronisation des cours : Yahoo → cache SQLite, avec throttle et tolérance hors-ligne.

import { and, asc, eq, max, min, sql } from "drizzle-orm";
import { db } from "@/db";
import { instruments, prices, priceSync, transactions } from "@/db/schema";
import { fetchDailyCloses } from "./yahoo";
import type { PricePoint } from "./portfolio";

const THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 h
const FETCH_PAUSE_MS = 300;

function daysBefore(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function upsertCloses(instrumentId: number, closes: PricePoint[]) {
  const CHUNK = 300;
  for (let i = 0; i < closes.length; i += CHUNK) {
    const rows = closes
      .slice(i, i + CHUNK)
      .map((p) => ({ instrumentId, date: p.date, close: p.close }));
    db.insert(prices)
      .values(rows)
      .onConflictDoUpdate({
        target: [prices.instrumentId, prices.date],
        set: { close: sql`excluded.close` },
      })
      .run();
  }
}

function markSync(instrumentId: number, error: string | null) {
  db.insert(priceSync)
    .values({ instrumentId, lastFetchedAt: new Date().toISOString(), lastError: error })
    .onConflictDoUpdate({
      target: priceSync.instrumentId,
      set: {
        lastFetchedAt: sql`excluded.last_fetched_at`,
        lastError: sql`excluded.last_error`,
      },
    })
    .run();
}

/**
 * Met à jour le cache des cours pour tous les instruments ayant des transactions.
 * Throttlé à 6 h par instrument (sauf `force`). Ne lève jamais : les erreurs
 * (hors-ligne, ticker inconnu) sont consignées dans price_sync.lastError.
 */
export async function syncPrices({ force = false } = {}): Promise<void> {
  const targets = db
    .select({
      id: instruments.id,
      symbol: instruments.symbol,
      firstTxDate: min(transactions.date),
    })
    .from(instruments)
    .innerJoin(transactions, eq(transactions.instrumentId, instruments.id))
    .groupBy(instruments.id)
    .all();

  const now = Date.now();
  let first = true;
  for (const target of targets) {
    const syncRow = db
      .select()
      .from(priceSync)
      .where(eq(priceSync.instrumentId, target.id))
      .get();
    if (
      !force &&
      syncRow &&
      now - new Date(syncRow.lastFetchedAt).getTime() < THROTTLE_MS
    ) {
      continue;
    }

    const lastCached = db
      .select({ d: max(prices.date) })
      .from(prices)
      .where(eq(prices.instrumentId, target.id))
      .get();
    const from = lastCached?.d ?? daysBefore(target.firstTxDate ?? todayISO(), 7);

    if (!first) await new Promise((r) => setTimeout(r, FETCH_PAUSE_MS));
    first = false;

    try {
      const { closes, latest } = await fetchDailyCloses(target.symbol, from);
      upsertCloses(target.id, closes);
      if (latest) upsertCloses(target.id, [latest]);
      markSync(target.id, null);
    } catch (err) {
      markSync(target.id, err instanceof Error ? err.message : String(err));
    }
  }
}

export interface PriceHealth {
  hasError: boolean;
  lastPriceDate: string | null;
  errors: Array<{ symbol: string; error: string }>;
}

/** État de fraîcheur des cours, pour la bannière hors-ligne du dashboard. */
export function getPriceHealth(): PriceHealth {
  const errors = db
    .select({ symbol: instruments.symbol, error: priceSync.lastError })
    .from(priceSync)
    .innerJoin(instruments, eq(instruments.id, priceSync.instrumentId))
    .where(sql`${priceSync.lastError} IS NOT NULL`)
    .all()
    .map((r) => ({ symbol: r.symbol, error: r.error ?? "" }));
  const lastPrice = db.select({ d: max(prices.date) }).from(prices).get();
  return {
    hasError: errors.length > 0,
    lastPriceDate: lastPrice?.d ?? null,
    errors,
  };
}

/** Dernier cours connu par instrument. */
export function getLatestPrices(instrumentIds: number[]): Map<number, PricePoint> {
  const out = new Map<number, PricePoint>();
  for (const id of instrumentIds) {
    const row = db
      .select()
      .from(prices)
      .where(eq(prices.instrumentId, id))
      .orderBy(sql`${prices.date} DESC`)
      .limit(1)
      .get();
    if (row) out.set(id, { date: row.date, close: row.close });
  }
  return out;
}

/** Historique complet des clôtures par instrument (trié par date croissante). */
export function getPriceHistories(
  instrumentIds: number[],
): Map<number, PricePoint[]> {
  const out = new Map<number, PricePoint[]>();
  for (const id of instrumentIds) {
    const rows = db
      .select()
      .from(prices)
      .where(and(eq(prices.instrumentId, id)))
      .orderBy(asc(prices.date))
      .all();
    out.set(
      id,
      rows.map((r) => ({ date: r.date, close: r.close })),
    );
  }
  return out;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
