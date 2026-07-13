"use client";

import * as React from "react";
import { toast } from "sonner";
import { updateInstrument } from "@/app/transactions/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface InstrumentData {
  id: number;
  symbol: string;
  name: string;
  isin: string | null;
  type: string;
}

export const TICKER_HELP =
  "Ticker Yahoo Finance — suffixe .PA pour Euronext Paris (ex. ENGI.PA, PAEEM.PA)";

export function InstrumentDialog({
  instrument,
  onClose,
}: {
  instrument: InstrumentData;
  onClose: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const symbolRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) symbolRef.current?.focus();
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await updateInstrument(form);
      if (result.ok) {
        toast.success("Instrument mis à jour — cours en cours d'actualisation");
        onClose();
      } else {
        setError(result.error ?? "Une erreur est survenue — vérifiez la saisie.");
      }
    });
  }

  return (
    <Dialog open onClose={onClose} title={`Modifier ${instrument.symbol}`}>
      <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
        <input type="hidden" name="id" value={instrument.id} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inst-symbol">Ticker Yahoo</Label>
            <Input
              id="inst-symbol"
              name="symbol"
              ref={symbolRef}
              defaultValue={instrument.symbol}
              spellCheck={false}
              required
            />
          </div>
          <div>
            <Label htmlFor="inst-type">Catégorie</Label>
            <Select id="inst-type" name="type" defaultValue={instrument.type}>
              <option value="ETF">ETF</option>
              <option value="ACTION">Action</option>
              <option value="FONDS">Fonds</option>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted">{TICKER_HELP}</p>

        <div>
          <Label htmlFor="inst-name">Nom</Label>
          <Input id="inst-name" name="name" defaultValue={instrument.name} required />
        </div>
        <div>
          <Label htmlFor="inst-isin">ISIN (optionnel)</Label>
          <Input
            id="inst-isin"
            name="isin"
            defaultValue={instrument.isin ?? ""}
            spellCheck={false}
          />
        </div>

        <p className="border-t border-edge pt-3 text-xs text-ink-2">
          Si le ticker change, l’historique de cours en cache est purgé puis
          re-téléchargé automatiquement depuis Yahoo Finance.
        </p>

        {error && (
          <p role="alert" className="border border-neg/40 px-3 py-2 text-sm text-neg">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
