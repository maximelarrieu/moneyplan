"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTransaction } from "@/app/transactions/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatEUR, formatPrice, formatQty } from "@/lib/format";
import { TransactionDialog } from "./transaction-dialog";
import { TX_TYPE_LABELS, type InstrumentOption, type TxRow } from "./types";

function amountOf(tx: TxRow): number {
  const isAmountTrade = tx.quantity == null && tx.unitPrice == null;
  switch (tx.type) {
    case "BUY":
      return isAmountTrade
        ? -((tx.amount ?? 0) + tx.fees)
        : -((tx.quantity ?? 0) * (tx.unitPrice ?? 0) + tx.fees);
    case "SELL":
      return isAmountTrade
        ? (tx.amount ?? 0) - tx.fees
        : (tx.quantity ?? 0) * (tx.unitPrice ?? 0) - tx.fees;
    case "DEPOSIT":
    case "DIVIDEND":
    case "REFUND":
    case "RETURN_OF_CAPITAL":
    case "INTEREST":
      return tx.amount ?? 0;
    case "WITHDRAWAL":
    case "FEE":
      return -(tx.amount ?? 0);
  }
}

export function TransactionsClient({
  accountId,
  accountLabel,
  txs,
  instruments,
}: {
  accountId: number;
  accountLabel: string;
  txs: TxRow[];
  instruments: InstrumentOption[];
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TxRow | null>(null);
  const [page, setPage] = React.useState(0);

  // Filtres reflétés dans l'URL (partage / retour arrière conservent l'état).
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type") ?? "ALL";
  const instrumentFilter = searchParams.get("instrument") ?? "ALL";
  const setFilter = (key: "type" | "instrument", value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    setPage(0); // un changement de filtre revient à la première page
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtered = txs.filter(
    (tx) =>
      (typeFilter === "ALL" || tx.type === typeFilter) &&
      (instrumentFilter === "ALL" || tx.instrumentId?.toString() === instrumentFilter),
  );

  // Pagination pour que le tableau tienne dans la page sans scroll.
  const PAGE_SIZE = 15;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1); // borne si la liste a rétréci
  const start = safePage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const [deleting, setDeleting] = React.useState<TxRow | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteTransaction(deleting.id);
    setDeleting(null);
    if (result.ok) toast.success("Transaction supprimée");
    else toast.error(result.error ?? "Erreur");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Transactions</h1>
          <p className="mt-0.5 text-xs text-muted">{accountLabel}</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" /> Ajouter
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          aria-label="Filtrer par type"
          className="w-40"
          value={typeFilter}
          onChange={(e) => setFilter("type", e.target.value)}
        >
          <option value="ALL">Tous les types</option>
          {Object.entries(TX_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrer par instrument"
          className="w-56"
          value={instrumentFilter}
          onChange={(e) => setFilter("instrument", e.target.value)}
        >
          <option value="ALL">Tous les instruments</option>
          {instruments.map((i) => (
            <option key={i.id} value={i.id}>
              {i.symbol} — {i.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Aucune transaction — ajoutez votre premier achat.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Instrument</TH>
                <TH className="text-right">Quantité</TH>
                <TH className="text-right">Prix unitaire</TH>
                <TH className="text-right">Frais</TH>
                <TH className="text-right">Mouvement</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {visible.map((tx) => {
                const amount = amountOf(tx);
                return (
                  <TR key={tx.id} className="hover:bg-ink/2">
                    <TD>{formatDate(tx.date)}</TD>
                    <TD>
                      <Badge>{TX_TYPE_LABELS[tx.type]}</Badge>
                    </TD>
                    <TD className="max-w-52 truncate">
                      {tx.instrumentSymbol ? (
                        <span title={tx.instrumentName ?? undefined}>
                          {tx.instrumentSymbol}
                        </span>
                      ) : (
                        <span className="text-muted">{tx.note ?? "—"}</span>
                      )}
                    </TD>
                    <TD className="text-right">
                      {tx.quantity != null ? formatQty(tx.quantity) : "—"}
                    </TD>
                    <TD className="text-right">
                      {tx.unitPrice != null ? formatPrice(tx.unitPrice) : "—"}
                    </TD>
                    <TD className="text-right">
                      {tx.fees ? formatEUR(tx.fees) : "—"}
                    </TD>
                    <TD
                      className={
                        "text-right font-medium " +
                        (amount >= 0 ? "text-pos" : "text-ink")
                      }
                    >
                      {formatEUR(amount)}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Modifier"
                          onClick={() => {
                            setEditing(tx);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer"
                          onClick={() => setDeleting(tx)}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-5 py-3">
            <p className="text-xs text-muted tabular-nums">
              {start + 1}–{start + visible.length} sur {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" /> Précédent
              </Button>
              <span className="text-xs text-muted tabular-nums">
                Page {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Suivant <ChevronRight className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {dialogOpen && (
        <TransactionDialog
          key={editing?.id ?? "new"}
          open
          accountId={accountId}
          onClose={() => setDialogOpen(false)}
          instruments={instruments}
          editing={editing}
        />
      )}

      <ConfirmDialog
        open={deleting != null}
        title="Supprimer cette transaction ?"
        description={
          deleting
            ? `${TX_TYPE_LABELS[deleting.type]} du ${formatDate(deleting.date)}${
                deleting.instrumentSymbol ? ` — ${deleting.instrumentSymbol}` : ""
              }. Cette action est définitive.`
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
