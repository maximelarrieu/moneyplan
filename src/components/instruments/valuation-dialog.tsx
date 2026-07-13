"use client";

import * as React from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { saveValuation } from "@/app/transactions/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Bouton + dialog pour saisir la valorisation totale d'un support manuel. */
export function ValuationButton({
  instrumentId,
  instrumentName,
}: {
  instrumentId: number;
  instrumentName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveValuation(form);
      if (result.ok) {
        toast.success("Valorisation enregistrée");
        setOpen(false);
      } else {
        setError(result.error ?? "Une erreur est survenue.");
      }
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Coins className="size-3.5" aria-hidden="true" /> Mettre à jour la valorisation
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={`Valorisation — ${instrumentName}`}>
          <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
            <input type="hidden" name="instrumentId" value={instrumentId} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="val-date">Date</Label>
                <Input
                  id="val-date"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <Label htmlFor="val-value">Valeur totale (€)</Label>
                <Input
                  id="val-value"
                  name="value"
                  inputMode="decimal"
                  placeholder="12 450"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted">
              Saisissez la valeur totale actuelle du support (relevé assureur), pas
              une valeur par part.
            </p>
            {error && (
              <p role="alert" className="border border-neg/40 px-3 py-2 text-sm text-neg">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
