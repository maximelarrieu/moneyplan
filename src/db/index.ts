import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Connexion unique, préservée à travers le HMR de Next en dev.
const globalForDb = globalThis as unknown as {
  moneyplanDb?: BetterSQLite3Database<typeof schema>;
};

function createDb() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const sqlite = new Database(path.join(dir, "moneyplan.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb.moneyplanDb ?? createDb();
globalForDb.moneyplanDb = db;
