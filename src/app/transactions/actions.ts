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
import { getAccount, getFirstAccount } from "@/lib/queries";
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

/** Résout l'instrument (existant ou créé à la volée) et indique s'il est manuel. */
function resolveInstrument(form: FormData): { id: number; manual: boolean } {
  const raw = String(form.get("instrumentId") ?? "");
  if (raw !== "new") {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Choisissez un instrument");
    }
    const inst = db.select().from(instruments).where(eq(instruments.id, id)).get();
    return { id, manual: !!inst?.manualValuation };
  }
  const manual = form.get("newManual") === "on";
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
  if (existing) return { id: existing.id, manual: !!existing.manualValuation };
  const id = db
    .insert(instruments)
    .values({
      symbol: parsed.symbol,
      name: parsed.name,
      isin: parsed.isin ?? null,
      type: parsed.type,
      manualValuation: manual,
    })
    .returning()
    .get().id;
  return { id, manual };
}

function resolveAccountId(form: FormData): number {
  const raw = Number(form.get("accountId"));
  if (Number.isInteger(raw) && raw > 0 && getAccount(raw)) return raw;
  return getFirstAccount().id; // filet de sécurité
}

export async function saveTransaction(form: FormData): Promise<ActionResult> {
  try {
    const accountId = resolveAccountId(form);
    const type = z.enum(TX_TYPES).parse(form.get("type"));
    const date = dateSchema.parse(form.get("date"));
    const note = String(form.get("note") ?? "").trim() || null;
    const idRaw = String(form.get("id") ?? "");
    const id = idRaw ? Number(idRaw) : null;

    let values: typeof transactions.$inferInsert;
    let depositTotal = 0; // pour le versement auto d'un achat

    if (type === "BUY" || type === "SELL") {
      const { id: instrumentId, manual } = resolveInstrument(form);
      const fees = nonNegative(
        "Les frais",
        "Les frais doivent être positifs ou nuls",
      ).parse(form.get("fees") || "0");
      if (manual) {
        // Support à valorisation manuelle : contribution/rachat en montant.
        const amount = positive(
          "Le montant",
          "Le montant doit être supérieur à zéro",
        ).parse(form.get("amount"));
        values = {
          accountId,
          instrumentId,
          type,
          date,
          quantity: null,
          unitPrice: null,
          fees,
          amount,
          note,
        };
        depositTotal = amount + fees;
      } else {
        const quantity = positive(
          "La quantité",
          "La quantité doit être supérieure à zéro",
        ).parse(form.get("quantity"));
        const unitPrice = positive(
          "Le prix unitaire",
          "Le prix unitaire doit être supérieur à zéro",
        ).parse(form.get("unitPrice"));
        values = {
          accountId,
          instrumentId,
          type,
          date,
          quantity,
          unitPrice,
          fees,
          amount: null,
          note,
        };
        depositTotal = quantity * unitPrice + fees;
      }
    } else if (type === "DIVIDEND" || type === "RETURN_OF_CAPITAL") {
      const { id: instrumentId } = resolveInstrument(form);
      const amount = positive(
        "Le montant",
        "Le montant doit être supérieur à zéro",
      ).parse(form.get("amount"));
      values = {
        accountId,
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
      // DEPOSIT / WITHDRAWAL / FEE / REFUND / INTEREST : mouvement de cash.
      const amount = positive(
        "Le montant",
        "Le montant doit être supérieur à zéro",
      ).parse(form.get("amount"));
      values = {
        accountId,
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
        db.insert(transactions)
          .values({
            accountId,
            instrumentId: null,
            type: "DEPOSIT",
            date,
            quantity: null,
            unitPrice: null,
            fees: 0,
            amount: Math.round(depositTotal * 100) / 100,
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

/** Enregistre la valorisation totale d'un support à valorisation manuelle. */
export async function saveValuation(form: FormData): Promise<ActionResult> {
  try {
    const instrumentId = Number(form.get("instrumentId"));
    if (!Number.isInteger(instrumentId) || instrumentId <= 0) {
      throw new Error("Instrument introuvable");
    }
    const date = dateSchema.parse(form.get("date"));
    const value = nonNegative(
      "La valorisation",
      "La valorisation doit être positive ou nulle",
    ).parse(form.get("value"));

    db.insert(prices)
      .values({ instrumentId, date, close: value })
      .onConflictDoUpdate({
        target: [prices.instrumentId, prices.date],
        set: { close: value },
      })
      .run();

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Saisie invalide" };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}
