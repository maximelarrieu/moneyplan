"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInstrument } from "@/app/transactions/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteInstrumentButton({
  instrumentId,
  instrumentName,
}: {
  instrumentId: number;
  instrumentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteInstrument(instrumentId);
      if (result.ok) {
        toast.success("Instrument supprimé");
        setOpen(false);
        router.push("/"); // la fiche n'existe plus
      } else {
        toast.error(result.error ?? "Erreur");
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Supprimer l'instrument ${instrumentName}`}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <Trash2 className="size-3.5" aria-hidden="true" /> Supprimer
      </Button>
      <ConfirmDialog
        open={open}
        title={`Supprimer ${instrumentName} ?`}
        description="Toutes les transactions de cet instrument et son historique de cours seront définitivement supprimés. Les versements de liquidités associés (le cas échéant) restent sur le compte."
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
