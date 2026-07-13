"use client";

import * as React from "react";
import { toast } from "sonner";
import { saveProfile } from "@/app/profil/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  monthlyIncome,
  monthlyExpenses,
  emergencyMonthsTarget,
}: {
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  emergencyMonthsTarget: number;
}) {
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveProfile(form);
      if (result.ok) toast.success("Profil enregistré");
      else toast.error(result.error ?? "Erreur");
    });
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
          <div>
            <Label htmlFor="pf-income">Revenu net mensuel (€, optionnel)</Label>
            <Input
              id="pf-income"
              name="monthlyIncome"
              inputMode="decimal"
              placeholder="2 500"
              defaultValue={monthlyIncome ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="pf-expenses">Dépenses mensuelles (€, optionnel)</Label>
            <Input
              id="pf-expenses"
              name="monthlyExpenses"
              inputMode="decimal"
              placeholder="1 800"
              defaultValue={monthlyExpenses ?? ""}
            />
            <p className="mt-1 text-xs text-muted">
              Base du matelas de sécurité : objectif = dépenses × nombre de mois.
            </p>
          </div>
          <div>
            <Label htmlFor="pf-months">Objectif matelas (mois de dépenses)</Label>
            <Input
              id="pf-months"
              name="emergencyMonthsTarget"
              inputMode="decimal"
              placeholder="4"
              defaultValue={emergencyMonthsTarget}
            />
            <p className="mt-1 text-xs text-muted">
              Recommandé : 3 à 6 mois de dépenses courantes.
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
