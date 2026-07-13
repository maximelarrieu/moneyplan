import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import { ACCOUNT_TYPE_LABELS, type TxRow } from "@/components/transactions/types";
import { getAccount, getInstruments, getTransactions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AccountTransactionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const accountId = Number(idRaw);
  const account = Number.isInteger(accountId) ? getAccount(accountId) : undefined;
  if (!account) notFound();

  const txs: TxRow[] = getTransactions(account.id).map((tx) => ({
    id: tx.id,
    type: tx.type,
    date: tx.date,
    quantity: tx.quantity,
    unitPrice: tx.unitPrice,
    fees: tx.fees,
    amount: tx.amount,
    note: tx.note,
    instrumentId: tx.instrumentId,
    instrumentSymbol: tx.instrument?.symbol ?? null,
    instrumentName: tx.instrument?.name ?? null,
  }));
  const instruments = getInstruments().map((i) => ({
    id: i.id,
    symbol: i.symbol,
    name: i.name,
    manualValuation: i.manualValuation,
  }));

  return (
    <div className="space-y-4">
      <Link
        href={`/comptes/${account.id}`}
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" /> {account.name}
      </Link>
      <TransactionsClient
        accountId={account.id}
        accountLabel={`${account.name} · ${ACCOUNT_TYPE_LABELS[account.type] ?? account.type}`}
        txs={txs}
        instruments={instruments}
      />
    </div>
  );
}
