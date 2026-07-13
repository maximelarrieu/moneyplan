"use client";

import * as React from "react";
import { toast } from "sonner";
import { saveTransaction } from "@/app/transactions/actions";
import { TICKER_HELP } from "@/components/instruments/instrument-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  TX_TYPE_HINTS,
  TX_TYPE_LABELS,
  type InstrumentOption,
  type TxRow,
} from "./types";

export function TransactionDialog({
  open,
  accountId,
  onClose,
  instruments,
  editing,
}: {
  open: boolean;
  accountId: number;
  onClose: () => void;
  instruments: InstrumentOption[];
  editing: TxRow | null;
}) {
  // Le parent monte/démonte ce composant à chaque ouverture : l'état
  // s'initialise au montage, pas besoin d'effet de resynchronisation.
  const [type, setType] = React.useState(editing?.type ?? "BUY");
  const [instrumentId, setInstrumentId] = React.useState<string>(
    editing?.instrumentId?.toString() ?? instruments[0]?.id.toString() ?? "new",
  );
  const [newManual, setNewManual] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const dirtyRef = React.useRef(false);
  const typeRef = React.useRef<HTMLSelectElement>(null);

  // Focus du premier champ à l'ouverture — pointeur précis uniquement
  // (sur mobile, éviter d'invoquer le clavier/menu d'entrée de jeu).
  React.useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) typeRef.current?.focus();
  }, []);

  const needsInstrument =
    type === "BUY" ||
    type === "SELL" ||
    type === "DIVIDEND" ||
    type === "RETURN_OF_CAPITAL";
  const isTrade = type === "BUY" || type === "SELL";
  // L'instrument sélectionné (ou en création) est-il à valorisation manuelle ?
  const selectedManual =
    instrumentId === "new"
      ? newManual
      : !!instruments.find((i) => i.id.toString() === instrumentId)?.manualValuation;
  const marketTrade = isTrade && !selectedManual; // quantité × prix
  const amountTrade = isTrade && selectedManual; // montant (fonds €…)

  // Garde de fermeture : ne pas perdre une saisie en cours sans confirmation.
  const [confirmAbandon, setConfirmAbandon] = React.useState(false);
  const requestClose = React.useCallback(() => {
    if (dirtyRef.current) setConfirmAbandon(true);
    else onClose();
  }, [onClose]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveTransaction(form);
      if (result.ok) {
        toast.success(editing ? "Transaction modifiée" : "Transaction ajoutée");
        onClose();
      } else {
        setError(result.error ?? "Une erreur est survenue — vérifiez la saisie.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={requestClose}
      title={editing ? "Modifier la transaction" : "Nouvelle transaction"}
    >
      <form
        onSubmit={onSubmit}
        onChange={() => {
          dirtyRef.current = true;
        }}
        autoComplete="off"
        className="space-y-4"
      >
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="accountId" value={accountId} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tx-type">Type</Label>
            <Select
              id="tx-type"
              name="type"
              ref={typeRef}
              value={type}
              onChange={(e) => setType(e.target.value as TxRow["type"])}
            >
              {Object.entries(TX_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tx-date">Date</Label>
            <Input
              id="tx-date"
              name="date"
              type="date"
              required
              defaultValue={editing?.date ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        {TX_TYPE_HINTS[type] && (
          <p className="-mt-2 text-xs text-muted">{TX_TYPE_HINTS[type]}</p>
        )}

        {needsInstrument && (
          <div>
            <Label htmlFor="tx-instrument">Instrument</Label>
            <Select
              id="tx-instrument"
              name="instrumentId"
              value={instrumentId}
              onChange={(e) => setInstrumentId(e.target.value)}
            >
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.symbol} — {i.name}
                </option>
              ))}
              <option value="new">➕ Nouvel instrument…</option>
            </Select>
          </div>
        )}

        {needsInstrument && instrumentId === "new" && (
          <div className="space-y-3 rounded-lg border border-edge p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-symbol">Ticker Yahoo</Label>
                <Input
                  id="new-symbol"
                  name="newSymbol"
                  placeholder="WPEA.PA"
                  spellCheck={false}
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-type">Catégorie</Label>
                <Select id="new-type" name="newType" defaultValue="ETF">
                  <option value="ETF">ETF</option>
                  <option value="ACTION">Action</option>
                  <option value="FONDS">Fonds</option>
                </Select>
              </div>
            </div>
            {!selectedManual && <p className="text-xs text-muted">{TICKER_HELP}</p>}
            <div>
              <Label htmlFor="new-name">Nom</Label>
              <Input
                id="new-name"
                name="newName"
                placeholder="iShares MSCI World Swap PEA"
                required
              />
            </div>
            <div>
              <Label htmlFor="new-isin">ISIN (optionnel)</Label>
              <Input id="new-isin" name="newIsin" placeholder="IE0002XZSHO1" spellCheck={false} />
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-xs text-ink-2">
              <input
                type="checkbox"
                name="newManual"
                checked={newManual}
                onChange={(e) => setNewManual(e.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                Support à valorisation manuelle (fonds €, SCPI…) — sans cours de
                bourse. Les contributions se saisissent en montant et la valeur se
                met à jour à la main.
              </span>
            </label>
          </div>
        )}

        {marketTrade && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="tx-quantity">Quantité</Label>
                <Input
                  id="tx-quantity"
                  name="quantity"
                  inputMode="decimal"
                  placeholder="10"
                  required
                  defaultValue={editing?.quantity ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="tx-price">Prix unitaire (€)</Label>
                <Input
                  id="tx-price"
                  name="unitPrice"
                  inputMode="decimal"
                  placeholder="5,43"
                  required
                  defaultValue={editing?.unitPrice ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="tx-fees">Frais (€)</Label>
                <Input
                  id="tx-fees"
                  name="fees"
                  inputMode="decimal"
                  placeholder="0,99+1,50"
                  defaultValue={editing?.fees || ""}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted">
              Astuce : additionnez plusieurs frais, ex. courtage + TTF →{" "}
              <span className="tabular-nums">0,99+1,50</span>.
            </p>
          </>
        )}

        {amountTrade && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-amount-trade">
                {type === "BUY" ? "Montant investi (€)" : "Montant retiré (€)"}
              </Label>
              <Input
                id="tx-amount-trade"
                name="amount"
                inputMode="decimal"
                placeholder="1000"
                required
                defaultValue={editing?.amount ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="tx-fees-trade">Frais (€)</Label>
              <Input
                id="tx-fees-trade"
                name="fees"
                inputMode="decimal"
                placeholder="0"
                defaultValue={editing?.fees || ""}
              />
            </div>
          </div>
        )}

        {!isTrade && (
          <div>
            <Label htmlFor="tx-amount">Montant (€)</Label>
            <Input
              id="tx-amount"
              name="amount"
              inputMode="decimal"
              placeholder="500"
              required
              defaultValue={editing?.amount ?? ""}
            />
          </div>
        )}

        {type === "BUY" && !editing && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="withDeposit" defaultChecked className="size-4" />
            Créer aussi le versement correspondant (montant + frais)
          </label>
        )}

        <div>
          <Label htmlFor="tx-note">Note (optionnel)</Label>
          <Input id="tx-note" name="note" defaultValue={editing?.note ?? ""} />
        </div>

        {error && (
          <p role="alert" className="border border-neg/40 px-3 py-2 text-sm text-neg">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={requestClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmAbandon}
        title="Abandonner la saisie en cours ?"
        description="Les informations saisies dans ce formulaire seront perdues."
        confirmLabel="Abandonner"
        danger
        onConfirm={onClose}
        onCancel={() => setConfirmAbandon(false)}
      />
    </Dialog>
  );
}
