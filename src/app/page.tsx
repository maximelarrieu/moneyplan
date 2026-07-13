import Link from "next/link";
import { AllocationDonut } from "@/components/dashboard/allocation-donut";
import { DashboardHero } from "@/components/dashboard/hero";
import { ValueChart } from "@/components/dashboard/value-chart";
import { AccountsSummary, type AccountSummaryRow } from "@/components/patrimoine/accounts-summary";
import { EmergencyGauge } from "@/components/patrimoine/emergency-gauge";
import { ACCOUNT_TYPE_LABELS } from "@/components/transactions/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  aggregateValueSeries,
  allocationFromValues,
  computeCashBalance,
  computeInterest,
  computeInvested,
  computePositions,
  computeValueSeries,
  type ValuePoint,
} from "@/lib/portfolio";
import { getLatestPrices, getPriceHistories, syncPrices, todayISO } from "@/lib/prices";
import {
  computeEmergencyFund,
  getInstruments,
  getManualInstrumentIds,
  getOrCreateProfile,
  getTransactionsAsc,
  listAccounts,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PatrimoinePage() {
  await syncPrices();
  const accounts = listAccounts();

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-lg pt-16">
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <h1 className="font-serif text-2xl">Bienvenue sur MoneyPlan</h1>
            <p className="text-sm text-ink-2">
              Créez votre premier compte (PEA, assurance-vie, livret…) pour
              commencer à suivre votre patrimoine.
            </p>
            <Link
              href="/comptes"
              className="inline-flex h-9 items-center bg-ink px-4 text-sm font-medium text-page transition-opacity duration-150 hover:opacity-85"
            >
              Créer un compte
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const instruments = getInstruments();
  const ids = instruments.map((i) => i.id);
  const manualIds = getManualInstrumentIds();
  const latestPrices = getLatestPrices(ids);
  const priceHistories = getPriceHistories(ids);
  const today = todayISO();

  let netWorth = 0;
  let invested = 0;
  let unrealized = 0;
  let dividends = 0;
  let interest = 0;
  let totalCash = 0;
  const byAccount: AccountSummaryRow[] = [];
  const byTypeMap = new Map<string, number>();
  const seriesList: ValuePoint[][] = [];

  for (const account of accounts) {
    const txs = getTransactionsAsc(account.id);
    if (txs.length === 0) {
      byAccount.push({ id: account.id, name: account.name, type: account.type, value: 0, weight: 0 });
      continue;
    }
    const positions = computePositions(txs, latestPrices, manualIds);
    const held = positions.filter((p) => p.held);
    const cash = computeCashBalance(txs);
    const value = held.reduce((s, p) => s + p.marketValue, 0) + cash;

    netWorth += value;
    totalCash += cash;
    invested += computeInvested(txs);
    unrealized += held.reduce((s, p) => s + (p.unrealizedPnL ?? 0), 0);
    dividends += positions.reduce((s, p) => s + p.dividends, 0);
    interest += computeInterest(txs);

    byAccount.push({ id: account.id, name: account.name, type: account.type, value, weight: 0 });
    byTypeMap.set(account.type, (byTypeMap.get(account.type) ?? 0) + value);
    seriesList.push(computeValueSeries(txs, priceHistories, today, manualIds));
  }

  for (const row of byAccount) row.weight = netWorth > 0 ? row.value / netWorth : 0;
  byAccount.sort((a, b) => b.value - a.value);

  const allocationByType = allocationFromValues(
    [...byTypeMap.entries()].map(([type, value]) => ({
      label: ACCOUNT_TYPE_LABELS[type] ?? type,
      value,
    })),
  );
  const series = aggregateValueSeries(seriesList, today);

  const profile = getOrCreateProfile();
  const emergency = computeEmergencyFund();

  return (
    <div className="space-y-8">
      <DashboardHero
        title="Patrimoine net"
        totalValue={netWorth}
        invested={invested}
        unrealizedPnL={unrealized}
        unrealizedPct={null}
        cash={totalCash}
        dividends={dividends}
        interest={interest}
        lastPriceDate={null}
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ValueChart data={series} />
        <div className="space-y-6">
          <EmergencyGauge
            current={emergency}
            monthlyExpenses={profile.monthlyExpenses}
            monthsTarget={profile.emergencyMonthsTarget}
          />
          <AllocationDonut slices={allocationByType} title="Répartition par enveloppe" />
        </div>
      </div>

      <AccountsSummary rows={byAccount} />
    </div>
  );
}
