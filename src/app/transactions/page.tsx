import { TransactionsClient } from "@/components/transactions/transactions-client";
import type { TxRow } from "@/components/transactions/types";
import {
  getInstruments,
  getOrCreateDefaultAccount,
  getTransactions,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const account = getOrCreateDefaultAccount();
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
  }));

  return <TransactionsClient txs={txs} instruments={instruments} />;
}
