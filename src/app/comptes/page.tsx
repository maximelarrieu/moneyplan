import { AccountsClient } from "@/components/accounts/accounts-client";
import { computeCashBalance, computePositions } from "@/lib/portfolio";
import { getLatestPrices } from "@/lib/prices";
import {
  countAccountTransactions,
  getInstruments,
  getManualInstrumentIds,
  listAccounts,
  getTransactionsAsc,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = listAccounts();
  const ids = getInstruments().map((i) => i.id);
  const manualIds = getManualInstrumentIds();
  const latestPrices = getLatestPrices(ids);

  const rows = accounts.map((a) => {
    const txs = getTransactionsAsc(a.id);
    const positions = computePositions(txs, latestPrices, manualIds);
    const value =
      positions.filter((p) => p.held).reduce((s, p) => s + p.marketValue, 0) +
      computeCashBalance(txs);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      value,
      txCount: countAccountTransactions(a.id),
    };
  });

  return <AccountsClient rows={rows} />;
}
