"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAccount } from "@/app/comptes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountDialog, type AccountEdit } from "./account-dialog";
import { ACCOUNT_TYPE_LABELS } from "@/components/transactions/types";
import { formatEUR } from "@/lib/format";

interface Row {
  id: number;
  name: string;
  type: string;
  value: number;
  txCount: number;
}

export function AccountsClient({ rows }: { rows: Row[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountEdit | null>(null);
  const [deleting, setDeleting] = React.useState<Row | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteAccount(deleting.id);
    setDeleting(null);
    if (result.ok) toast.success("Compte supprimé");
    else toast.error(result.error ?? "Erreur");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl tracking-tight">Comptes</h1>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" /> Nouveau compte
        </Button>
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Aucun compte — créez votre PEA, une assurance-vie, un livret…
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Compte</TH>
                <TH>Type</TH>
                <TH className="text-right">Valeur</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id} className="hover:bg-ink/2">
                  <TD>
                    <Link
                      href={`/comptes/${row.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TD>
                  <TD>
                    <Badge>{ACCOUNT_TYPE_LABELS[row.type] ?? row.type}</Badge>
                  </TD>
                  <TD className="text-right font-medium">{formatEUR(row.value)}</TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Modifier ${row.name}`}
                        onClick={() => {
                          setEditing({ id: row.id, name: row.name, type: row.type });
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${row.name}`}
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {dialogOpen && (
        <AccountDialog
          key={editing?.id ?? "new"}
          editing={editing}
          onClose={() => setDialogOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleting != null}
        title="Supprimer ce compte ?"
        description={
          deleting
            ? deleting.txCount > 0
              ? `« ${deleting.name} » contient ${deleting.txCount} transaction(s). Videz-le d'abord — la suppression sera refusée.`
              : `« ${deleting.name} » sera supprimé. Cette action est définitive.`
            : undefined
        }
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
