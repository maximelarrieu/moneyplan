// Requêtes partagées entre pages et Server Actions.

import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  instruments,
  profile,
  transactions,
  type Account,
  type Instrument,
  type Profile,
  type Transaction,
} from "@/db/schema";
import { computeCashBalance } from "@/lib/portfolio";

/** Types de comptes qui portent le matelas de sécurité (épargne liquide garantie). */
export const SAFE_ACCOUNT_TYPES = ["LIVRET_A", "LDD"] as const;

/** Premier compte (bootstrap / cibles de redirection) ; crée un PEA si aucun. */
export function getFirstAccount(): Account {
  const existing = db.select().from(accounts).orderBy(asc(accounts.id)).get();
  if (existing) return existing;
  return db
    .insert(accounts)
    .values({ name: "PEA", type: "PEA", createdAt: new Date().toISOString() })
    .returning()
    .get();
}

export function listAccounts(): Account[] {
  return db.select().from(accounts).orderBy(asc(accounts.id)).all();
}

export function getAccount(id: number): Account | undefined {
  return db.select().from(accounts).where(eq(accounts.id, id)).get();
}

export function countAccountTransactions(accountId: number): number {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .all().length;
}

export function getInstruments(): Instrument[] {
  return db.select().from(instruments).orderBy(asc(instruments.symbol)).all();
}

export function getInstrument(id: number): Instrument | undefined {
  return db.select().from(instruments).where(eq(instruments.id, id)).get();
}

/** Ids des instruments à valorisation manuelle (fonds €…). */
export function getManualInstrumentIds(): Set<number> {
  const rows = db
    .select({ id: instruments.id })
    .from(instruments)
    .where(eq(instruments.manualValuation, true))
    .all();
  return new Set(rows.map((r) => r.id));
}

export type TransactionWithInstrument = Transaction & {
  instrument: Instrument | null;
};

export function getTransactions(accountId: number): TransactionWithInstrument[] {
  const rows = db
    .select()
    .from(transactions)
    .leftJoin(instruments, eq(transactions.instrumentId, instruments.id))
    .where(eq(transactions.accountId, accountId))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all();
  return rows.map((r) => ({ ...r.transactions, instrument: r.instruments }));
}

/** Transactions triées par date croissante (entrée des calculs de portefeuille). */
export function getTransactionsAsc(accountId: number): TransactionWithInstrument[] {
  return getTransactions(accountId).reverse();
}

/** Toutes les transactions d'un instrument, tous comptes confondus (date croissante). */
export function getInstrumentTransactionsAsc(
  instrumentId: number,
): TransactionWithInstrument[] {
  const rows = db
    .select()
    .from(transactions)
    .leftJoin(instruments, eq(transactions.instrumentId, instruments.id))
    .where(eq(transactions.instrumentId, instrumentId))
    .orderBy(asc(transactions.date), asc(transactions.id))
    .all();
  return rows.map((r) => ({ ...r.transactions, instrument: r.instruments }));
}

/** Toutes les transactions, tous comptes (date croissante) — pour la simulation. */
export function getAllTransactionsAsc(): TransactionWithInstrument[] {
  const rows = db
    .select()
    .from(transactions)
    .leftJoin(instruments, eq(transactions.instrumentId, instruments.id))
    .orderBy(asc(transactions.date), asc(transactions.id))
    .all();
  return rows.map((r) => ({ ...r.transactions, instrument: r.instruments }));
}

export function getOrCreateProfile(): Profile {
  const existing = db.select().from(profile).where(eq(profile.id, 1)).get();
  if (existing) return existing;
  return db
    .insert(profile)
    .values({ id: 1, emergencyMonthsTarget: 4, updatedAt: new Date().toISOString() })
    .returning()
    .get();
}

/**
 * Matelas de sécurité : somme des liquidités des comptes « sûrs » (livrets).
 * Ces comptes n'ont pas d'instrument → valeur = solde de liquidités.
 */
export function computeEmergencyFund(): number {
  const safe = db
    .select({ id: accounts.id })
    .from(accounts)
    .where(inArray(accounts.type, [...SAFE_ACCOUNT_TYPES]))
    .all();
  return safe.reduce(
    (sum, a) => sum + computeCashBalance(getTransactionsAsc(a.id)),
    0,
  );
}
