import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const ACCOUNT_TYPES = [
  "PEA",
  "CTO",
  "ASSURANCE_VIE",
  "PER",
  "PEE",
  "LDD",
  "LIVRET_A",
  "AUTRE",
] as const;

export const INSTRUMENT_TYPES = ["ETF", "ACTION", "FONDS"] as const;

export const TX_TYPES = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "DEPOSIT",
  "WITHDRAWAL",
  "FEE",
  "REFUND", // remboursement de frais : crédit de liquidités hors versement (ex. frais trop perçus)
  "RETURN_OF_CAPITAL", // remboursement d'apport : réduit le PRU, pas un revenu
  "INTEREST", // intérêts (livret) : crédit de liquidités compté en gain, hors montant investi
] as const;

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ACCOUNT_TYPES }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  createdAt: text("created_at").notNull(),
});

export const instruments = sqliteTable("instruments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull().unique(),
  isin: text("isin"),
  name: text("name").notNull(),
  type: text("type", { enum: INSTRUMENT_TYPES }).notNull().default("ETF"),
  currency: text("currency").notNull().default("EUR"),
  // Support sans cours de bourse (fonds €…) : valorisation saisie à la main,
  // pas de fetch Yahoo. Les contributions se saisissent en montant.
  manualValuation: integer("manual_valuation", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    instrumentId: integer("instrument_id").references(() => instruments.id),
    type: text("type", { enum: TX_TYPES }).notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    quantity: real("quantity"),
    unitPrice: real("unit_price"),
    fees: real("fees").notNull().default(0),
    amount: real("amount"),
    note: text("note"),
  },
  (t) => [
    index("tx_account_date_idx").on(t.accountId, t.date),
    index("tx_instrument_idx").on(t.instrumentId),
  ],
);

export const prices = sqliteTable(
  "prices",
  {
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id),
    date: text("date").notNull(), // YYYY-MM-DD (jours de cotation uniquement)
    close: real("close").notNull(),
  },
  (t) => [primaryKey({ columns: [t.instrumentId, t.date] })],
);

export const priceSync = sqliteTable("price_sync", {
  instrumentId: integer("instrument_id")
    .primaryKey()
    .references(() => instruments.id),
  lastFetchedAt: text("last_fetched_at").notNull(),
  lastError: text("last_error"),
});

// Profil financier (ligne unique id=1) — reste 100 % local, alimente la jauge
// matelas de sécurité et, plus tard, le conseiller.
export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey().default(1),
  monthlyIncome: real("monthly_income"),
  monthlyExpenses: real("monthly_expenses"),
  emergencyMonthsTarget: real("emergency_months_target").notNull().default(4),
  updatedAt: text("updated_at").notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Instrument = typeof instruments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type Profile = typeof profile.$inferSelect;
