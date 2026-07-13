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
  "REFUND", // crédit de liquidités hors versement (ex. frais trop perçus)
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

export type Account = typeof accounts.$inferSelect;
export type Instrument = typeof instruments.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Price = typeof prices.$inferSelect;
