import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { refreshPrices } from "@/app/transactions/actions";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { AllocationDonut } from "@/components/dashboard/allocation-donut";
import { DashboardHero } from "@/components/dashboard/hero";
import { PositionsTable, type PositionRow } from "@/components/dashboard/positions-table";
import { ValueChart } from "@/components/dashboard/value-chart";
import { Card, CardContent } from "@/components/ui/card";
import { ACCOUNT_TYPE_LABELS } from "@/components/transactions/types";
import { formatDate } from "@/lib/format";
import {
  computeAllocation,
  computeCashBalance,
  computeInterest,
  computeInvested,
  computePositions,
  computeValueSeries,
} from "@/lib/portfolio";
import {
  getLatestPrices,
  getPriceHealth,
  getPriceHistories,
  syncPrices,
  todayISO,
} from "@/lib/prices";
import {
  getAccount,
  getInstruments,
  getManualInstrumentIds,
  getTransactionsAsc,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const accountId = Number(idRaw);
  const account = Number.isInteger(accountId) ? getAccount(accountId) : undefined;
  if (!account) notFound();

  await syncPrices(); // throttlé à 6 h par instrument

  const txs = getTransactionsAsc(account.id);
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;

  const addLink = (
    <Link
      href={`/comptes/${account.id}/transactions`}
      className="inline-flex h-8 items-center gap-1.5 border border-edge px-3 text-xs text-ink transition-colors duration-150 hover:border-axis"
    >
      <ArrowLeftRight className="size-3.5" aria-hidden="true" /> Transactions
    </Link>
  );

  if (txs.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-3xl tracking-tight">{account.name}</h1>
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm text-ink-2">
              Aucune transaction sur ce compte {typeLabel}. Ajoutez un premier
              mouvement pour voir sa valeur.
            </p>
            <Link
              href={`/comptes/${account.id}/transactions`}
              className="inline-flex h-9 items-center bg-ink px-4 text-sm font-medium text-page transition-opacity duration-150 hover:opacity-85"
            >
              Ajouter une transaction
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const instruments = getInstruments();
  const names = new Map(instruments.map((i) => [i.id, i.name]));
  const symbols = new Map(instruments.map((i) => [i.id, i.symbol]));
  const ids = instruments.map((i) => i.id);
  const manualIds = getManualInstrumentIds();

  const latestPrices = getLatestPrices(ids);
  const positions = computePositions(txs, latestPrices, manualIds);
  const cash = computeCashBalance(txs);
  const invested = computeInvested(txs);
  const interest = computeInterest(txs);
  const health = getPriceHealth();

  const held = positions.filter((p) => p.held);
  const totalValue = held.reduce((s, p) => s + p.marketValue, 0) + cash;
  const totalUnrealized = held.reduce((s, p) => s + (p.unrealizedPnL ?? 0), 0);
  const totalDividends = positions.reduce((s, p) => s + p.dividends, 0);
  const totalCostBasis = held.reduce((s, p) => s + p.costBasis, 0);

  const series = computeValueSeries(txs, getPriceHistories(ids), todayISO(), manualIds);
  const allocation = computeAllocation(positions, cash, names);
  const lastPriceDate = [...latestPrices.values()].reduce<string | null>(
    (latest, p) => (latest == null || p.date > latest ? p.date : latest),
    null,
  );

  const rows: PositionRow[] = held
    .sort((a, b) => b.marketValue - a.marketValue)
    .map((p) => ({
      instrumentId: p.instrumentId,
      symbol: symbols.get(p.instrumentId) ?? "?",
      name: names.get(p.instrumentId) ?? "?",
      quantity: p.quantity,
      pru: p.pru,
      lastPrice: p.lastPrice,
      marketValue: p.marketValue,
      unrealizedPnL: p.unrealizedPnL,
      unrealizedPct: p.unrealizedPct,
      weight: totalValue > 0 ? p.marketValue / totalValue : 0,
      manual: p.manual,
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            {typeLabel}
          </p>
          <DashboardHero
            title={account.name}
            totalValue={totalValue}
            invested={invested}
            unrealizedPnL={totalUnrealized}
            unrealizedPct={totalCostBasis > 0 ? totalUnrealized / totalCostBasis : null}
            cash={cash}
            dividends={totalDividends}
            interest={interest}
            lastPriceDate={lastPriceDate}
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          {addLink}
          <form action={refreshPrices}>
            <RefreshButton />
          </form>
        </div>
      </div>

      {health.hasError && (
        <div className="flex items-start gap-2.5 border border-edge bg-surface px-4 py-3 text-sm text-ink-2">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-[var(--chart-3)]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-medium text-ink">
              Cours non actualisés
              {health.lastPriceDate
                ? ` (dernier cours : ${formatDate(health.lastPriceDate)})`
                : ""}
            </p>
            <p className="break-words text-xs">
              {health.errors.map((e, i) => (
                <span key={e.instrumentId}>
                  {i > 0 && " · "}
                  <Link
                    href={`/positions/${e.instrumentId}`}
                    className="font-medium text-accent hover:underline"
                    translate="no"
                  >
                    {e.symbol}
                  </Link>
                  {` : ${e.error}`}
                </span>
              ))}
            </p>
            <p className="mt-1 text-xs text-muted">
              Un « HTTP 404 » signale le plus souvent un ticker Yahoo erroné —
              cliquez sur le ticker puis « Modifier » pour le corriger
              (ex. ENGI.PA, PAEEM.PA pour Euronext Paris).
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ValueChart data={series} />
        <AllocationDonut slices={allocation} />
      </div>

      {rows.length > 0 && <PositionsTable rows={rows} />}
    </div>
  );
}
