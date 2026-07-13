"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, ACCOUNT_TYPES } from "@/db/schema";
import { countAccountTransactions } from "@/lib/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const accountSchema = z.object({
  name: z.string().trim().min(1, "Le nom du compte est requis"),
  type: z.enum(ACCOUNT_TYPES),
});

export async function saveAccount(form: FormData): Promise<ActionResult> {
  try {
    const parsed = accountSchema.parse({
      name: form.get("name"),
      type: form.get("type"),
    });
    const idRaw = String(form.get("id") ?? "");
    const id = idRaw ? Number(idRaw) : null;

    if (id) {
      db.update(accounts)
        .set({ name: parsed.name, type: parsed.type })
        .where(eq(accounts.id, id))
        .run();
    } else {
      db.insert(accounts)
        .values({
          name: parsed.name,
          type: parsed.type,
          createdAt: new Date().toISOString(),
        })
        .run();
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

export async function deleteAccount(id: number): Promise<ActionResult> {
  try {
    if (countAccountTransactions(id) > 0) {
      return {
        ok: false,
        error: "Ce compte contient des transactions — videz-le avant de le supprimer.",
      };
    }
    db.delete(accounts).where(eq(accounts.id, id)).run();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}
