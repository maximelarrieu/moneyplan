import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PriceChart, type PricePointWithBuy } from "@/components/positions/price-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TX_TYPE_LABELS } from "@/components/transactions/types";
import { formatDate, formatEUR, formatPct, formatPrice, formatQty, formatSignedEUR } from "@/lib/format";
import { computePositions } from "@/lib/portfolio";
import { getLatestPrices, getPriceHistories } from "@/lib/prices";
import { getInstrument, getOrCreateDefaultAccount, getTransactionsAsc } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const INSTRUMENT_TYPE_LABELS: Record<string, string> = {
  ETF: "ETF",
  ACTION: "Action",
  FONDS: "Fonds",
};

export default async function PositionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  const instrument = Number.isInteger(id) ? getInstrument(id) : undefined;
  if (!instrument) notFound();

  const account = getOrCreateDefaultAccount();
  const allTxs = getTransactionsAsc(account.id);
  const txs = allTxs.filter((t) => t.instrumentId === id);
  const position = computePositions(allTxs, getLatestPrices([id])).find(
    (p) => p.instrumentId === id,
  );
  const history = getPriceHistories([id]).get(id) ?? [];

  // Marqueurs d'achat posés sur la date de cotation la plus proche (≤ date d'achat).
  const buys = txs.filter((t) => t.type === "BUY");
  const chartData: PricePointWithBuy[] = history.map((p) => ({ ...p }));
  for (const buy of buys) {
    let target: PricePointWithBuy | undefined;
    for (const point of chartData) {
      if (point.date <= buy.date) target = point;
      else break;
    }
    if (target) target.buy = buy.unitPrice ?? undefined;
  }

  const pnlClass =
    position?.unrealizedPnL != null && position.unrealizedPnL < 0
      ? "text-neg"
      : "text-pos";

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Tableau de bord
        </Link>
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-pretty font-serif text-3xl tracking-tight">{instrument.name}</h1>
          <Badge translate="no">{instrument.symbol}</Badge>
          <Badge>{INSTRUMENT_TYPE_LABELS[instrument.type] ?? instrument.type}</Badge>
          {instrument.isin && <Badge>{instrument.isin}</Badge>}
        </div>
      </div>

      {position && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Stat title="Quantité" value={formatQty(position.quantity)} />
          <Stat
            title="PRU"
            value={position.pru != null ? formatPrice(position.pru) : "—"}
          />
          <Stat
            title={
              position.lastPriceDate
                ? `Cours (${formatDate(position.lastPriceDate)})`
                : "Dernier cours"
            }
            value={position.lastPrice != null ? formatPrice(position.lastPrice) : "—"}
          />
          <Stat title="Valeur" value={formatEUR(position.marketValue)} />
          <Card>
            <CardHeader>
              <CardTitle>± value latente</CardTitle>
            </CardHeader>
            <CardContent>
              {position.unrealizedPnL != null ? (
                <>
                  <p className={cn("font-serif text-2xl tracking-tight tabular-nums", pnlClass)}>
                    {formatSignedEUR(position.unrealizedPnL)}
                  </p>
                  {position.unrealizedPct != null && (
                    <p className={cn("text-xs", pnlClass)}>
                      {formatPct(position.unrealizedPct)}
                    </p>
                  )}
                </>
              ) : (
                <p className="font-serif text-2xl">—</p>
              )}
            </CardContent>
          </Card>
          <Stat title="Dividendes reçus" value={formatEUR(position.dividends)} />
        </div>
      )}

      <PriceChart data={chartData} pru={position?.pru ?? null} />

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH className="text-right">Quantité</TH>
              <TH className="text-right">Prix unitaire</TH>
              <TH className="text-right">Frais</TH>
              <TH className="text-right">Montant</TH>
            </TR>
          </THead>
          <TBody>
            {[...txs].reverse().map((tx) => (
              <TR key={tx.id}>
                <TD>{formatDate(tx.date)}</TD>
                <TD>
                  <Badge>{TX_TYPE_LABELS[tx.type]}</Badge>
                </TD>
                <TD className="text-right">
                  {tx.quantity != null ? formatQty(tx.quantity) : "—"}
                </TD>
                <TD className="text-right">
                  {tx.unitPrice != null ? formatPrice(tx.unitPrice) : "—"}
                </TD>
                <TD className="text-right">{tx.fees ? formatEUR(tx.fees) : "—"}</TD>
                <TD className="text-right">
                  {tx.type === "BUY" || tx.type === "SELL"
                    ? formatEUR((tx.quantity ?? 0) * (tx.unitPrice ?? 0) + (tx.type === "BUY" ? tx.fees : -tx.fees))
                    : tx.amount != null
                      ? formatEUR(tx.amount)
                      : "—"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-serif text-2xl tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
