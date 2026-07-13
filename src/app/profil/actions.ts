"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { getOrCreateProfile } from "@/lib/queries";
import { parseAmount } from "@/lib/parse-amount";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Nombre optionnel à la française (champ vide → null). */
function optionalAmount(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = parseAmount(s);
  if (!Number.isFinite(n) || n < 0) throw new Error("Montant invalide");
  return n;
}

export async function saveProfile(form: FormData): Promise<ActionResult> {
  try {
    getOrCreateProfile(); // garantit la ligne id=1
    const monthlyIncome = optionalAmount(form.get("monthlyIncome"));
    const monthlyExpenses = optionalAmount(form.get("monthlyExpenses"));
    const monthsRaw = String(form.get("emergencyMonthsTarget") ?? "").trim();
    const months = monthsRaw === "" ? 4 : parseAmount(monthsRaw);
    if (!Number.isFinite(months) || months <= 0) {
      return { ok: false, error: "L’objectif de matelas doit être un nombre de mois positif" };
    }

    db.update(profile)
      .set({
        monthlyIncome,
        monthlyExpenses,
        emergencyMonthsTarget: months,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(profile.id, 1))
      .run();

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}
