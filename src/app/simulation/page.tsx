// Page de projection : les entrées viennent du patrimoine réel (tous comptes).
import { SimulationClient } from "@/components/simulation/simulation-client";
import { computeCashBalance, computePositions } from "@/lib/portfolio";
import { getLatestPrices } from "@/lib/prices";
import {
  getAllTransactionsAsc,
  getInstruments,
  getManualInstrumentIds,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SimulationPage() {
  const txs = getAllTransactionsAsc();
  const ids = getInstruments().map((i) => i.id);
  const manualIds = getManualInstrumentIds();
  const positions = computePositions(txs, getLatestPrices(ids), manualIds);
  const currentValue =
    positions.reduce((s, p) => s + p.marketValue, 0) + computeCashBalance(txs);

  // DCA mensuel moyen constaté : versements des 6 derniers mois / 6.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
  const cutoff = sixMonthsAgo.toISOString().slice(0, 10);
  const recentDeposits = txs
    .filter((t) => t.type === "DEPOSIT" && t.date >= cutoff)
    .reduce((s, t) => s + (t.amount ?? 0), 0);
  const avgMonthly = Math.round(recentDeposits / 6 / 10) * 10;

  return (
    <SimulationClient
      defaultInitial={Math.max(0, Math.round(currentValue))}
      defaultMonthly={avgMonthly > 0 ? avgMonthly : 300}
    />
  );
}
