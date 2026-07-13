// Requêtes partagées entre pages et Server Actions.

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  instruments,
  transactions,
  type Account,
  type Instrument,
  type Transaction,
} from "@/db/schema";

/** Compte PEA par défaut, créé au premier lancement. */
export function getOrCreateDefaultAccount(): Account {
  const existing = db.select().from(accounts).orderBy(asc(accounts.id)).get();
  if (existing) return existing;
  return db
    .insert(accounts)
    .values({ name: "PEA", type: "PEA", createdAt: new Date().toISOString() })
    .returning()
    .get();
}

export function getInstruments(): Instrument[] {
  return db.select().from(instruments).orderBy(asc(instruments.symbol)).all();
}

export function getInstrument(id: number): Instrument | undefined {
  return db.select().from(instruments).where(eq(instruments.id, id)).get();
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
