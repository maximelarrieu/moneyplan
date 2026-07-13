"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  instruments,
  prices,
  priceSync,
  transactions,
  INSTRUMENT_TYPES,
  TX_TYPES,
} from "@/db/schema";
import { getOrCreateDefaultAccount } from "@/lib/queries";
import { syncPrices } from "@/lib/prices";
import { parseAmount } from "@/lib/parse-amount";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Nombre saisi à la française : virgule décimale et addition (« 0,99+1,50 »). */
const frNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} est requis`)
    .transform((s) => parseAmount(s))
    .refine((n) => Number.isFinite(n), `${label} est invalide`);

const positive = (label: string, message: string) =>
  frNumber(label).refine((n) => n > 0, message);

const nonNegative = (label: string, message: string) =>
  frNumber(label).refine((n) => n >= 0, message);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

const newInstrumentSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, "Le ticker est requis")
    .transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1, "Le nom est requis"),
  isin: z.string().trim().optional(),
  type: z.enum(INSTRUMENT_TYPES),
});

function resolveInstrumentId(form: FormData): number {
  const raw = String(form.get("instrumentId") ?? "");
  if (raw !== "new") {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Choisissez un instrument");
    }
    return id;
  }
  const parsed = newInstrumentSchema.parse({
    symbol: form.get("newSymbol"),
    name: form.get("newName"),
    isin: form.get("newIsin") || undefined,
    type: form.get("newType") || "ETF",
  });
  const existing = db
    .select()
    .from(instruments)
    .where(eq(instruments.symbol, parsed.symbol))
    .get();
  if (existing) return existing.id;
  return db
    .insert(instruments)
    .values({
      symbol: parsed.symbol,
      name: parsed.name,
      isin: parsed.isin ?? null,
      type: parsed.type,
    })
    .returning()
    .get().id;
}

export async function saveTransaction(form: FormData): Promise<ActionResult> {
  try {
    const account = getOrCreateDefaultAccount();
    const type = z.enum(TX_TYPES).parse(form.get("type"));
    const date = dateSchema.parse(form.get("date"));
    const note = String(form.get("note") ?? "").trim() || null;
    const idRaw = String(form.get("id") ?? "");
    const id = idRaw ? Number(idRaw) : null;

    let values: typeof transactions.$inferInsert;

    if (type === "BUY" || type === "SELL") {
      const instrumentId = resolveInstrumentId(form);
      const quantity = positive(
        "La quantité",
        "La quantité doit être supérieure à zéro",
      ).parse(form.get("quantity"));
      const unitPrice = positive(
        "Le prix unitaire",
        "Le prix unitaire doit être supérieur à zéro",
      ).parse(form.get("unitPrice"));
      const fees = nonNegative(
        "Les frais",
        "Les frais doivent être positifs ou nuls",
      ).parse(form.get("fees") || "0");
      values = {
        accountId: account.id,
        instrumentId,
        type,
        date,
        quantity,
        unitPrice,
        fees,
        amount: null,
        note,
      };
    } else if (type === "DIVIDEND" || type === "RETURN_OF_CAPITAL") {
      const instrumentId = resolveInstrumentId(form);
      const amount = positive(
        "Le montant",
        "Le montant doit être supérieur à zéro",
      ).parse(form.get("amount"));
      values = {
        accountId: account.id,
        instrumentId,
        type,
        date,
        quantity: null,
        unitPrice: null,
        fees: 0,
        amount,
        note,
      };
    } else {
      const amount = positive(
        "Le montant",
        "Le montant doit être supérieur à zéro",
      ).parse(form.get("amount"));
      values = {
        accountId: account.id,
        instrumentId: null,
        type,
        date,
        quantity: null,
        unitPrice: null,
        fees: 0,
        amount,
        note,
      };
    }

    if (id) {
      db.update(transactions).set(values).where(eq(transactions.id, id)).run();
    } else {
      db.insert(transactions).values(values).run();
      // Flux DCA typique : le versement qui finance l'achat, créé d'un coup.
      if (type === "BUY" && form.get("withDeposit") === "on") {
        const total =
          (values.quantity ?? 0) * (values.unitPrice ?? 0) + (values.fees ?? 0);
        db.insert(transactions)
          .values({
            accountId: account.id,
            instrumentId: null,
            type: "DEPOSIT",
            date,
            quantity: null,
            unitPrice: null,
            fees: 0,
            amount: Math.round(total * 100) / 100,
            note: "Versement lié à l’achat",
          })
          .run();
      }
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Saisie invalide" };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

export async function updateInstrument(form: FormData): Promise<ActionResult> {
  try {
    const id = Number(form.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("Instrument introuvable");
    const current = db.select().from(instruments).where(eq(instruments.id, id)).get();
    if (!current) throw new Error("Instrument introuvable");

    const parsed = newInstrumentSchema.parse({
      symbol: form.get("symbol"),
      name: form.get("name"),
      isin: form.get("isin") || undefined,
      type: form.get("type") || current.type,
    });

    const clash = db
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, parsed.symbol))
      .get();
    if (clash && clash.id !== id) {
      throw new Error(
        `Le ticker ${parsed.symbol} est déjà utilisé par « ${clash.name} »`,
      );
    }

    db.update(instruments)
      .set({
        symbol: parsed.symbol,
        name: parsed.name,
        isin: parsed.isin ?? null,
        type: parsed.type,
      })
      .where(eq(instruments.id, id))
      .run();

    // Ticker corrigé → le cache de cours de l'ancien ticker n'a plus de sens :
    // on le purge et on relance une synchro (l'historique complet sera
    // re-téléchargé depuis la première transaction de l'instrument).
    if (current.symbol !== parsed.symbol) {
      db.delete(prices).where(eq(prices.instrumentId, id)).run();
      db.delete(priceSync).where(eq(priceSync.instrumentId, id)).run();
      await syncPrices();
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Saisie invalide" };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

export async function deleteTransaction(id: number): Promise<ActionResult> {
  try {
    db.delete(transactions).where(eq(transactions.id, id)).run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

export async function refreshPrices(): Promise<void> {
  await syncPrices({ force: true });
  revalidatePath("/", "layout");
}
