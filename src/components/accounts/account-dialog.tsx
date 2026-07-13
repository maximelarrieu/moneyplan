"use client";

import * as React from "react";
import { toast } from "sonner";
import { saveAccount } from "@/app/comptes/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACCOUNT_TYPE_LABELS } from "@/components/transactions/types";

export interface AccountEdit {
  id: number;
  name: string;
  type: string;
}

export function AccountDialog({
  editing,
  onClose,
}: {
  editing: AccountEdit | null;
  onClose: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const nameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) nameRef.current?.focus();
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveAccount(form);
      if (result.ok) {
        toast.success(editing ? "Compte modifié" : "Compte créé");
        onClose();
      } else {
        setError(result.error ?? "Une erreur est survenue.");
      }
    });
  }

  return (
    <Dialog open onClose={onClose} title={editing ? "Modifier le compte" : "Nouveau compte"}>
      <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div>
          <Label htmlFor="acc-name">Nom du compte</Label>
          <Input
            id="acc-name"
            name="name"
            ref={nameRef}
            placeholder="PEA Bourse Direct"
            defaultValue={editing?.name ?? ""}
            required
          />
        </div>
        <div>
          <Label htmlFor="acc-type">Type</Label>
          <Select id="acc-type" name="type" defaultValue={editing?.type ?? "PEA"}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

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
