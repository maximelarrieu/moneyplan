import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR, formatPct, formatSignedEUR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SummaryCards({
  totalValue,
  invested,
  unrealizedPnL,
  unrealizedPct,
  cash,
  dividends,
}: {
  totalValue: number;
  invested: number;
  unrealizedPnL: number;
  unrealizedPct: number | null;
  cash: number;
  dividends: number;
}) {
  const pnlClass = unrealizedPnL >= 0 ? "text-pos" : "text-neg";
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      <Stat title="Valeur totale" value={formatEUR(totalValue)} />
      <Stat title="Montant investi" value={formatEUR(invested)} />
      <Card>
        <CardHeader>
          <CardTitle>Plus-value latente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn("text-xl font-semibold tracking-tight", pnlClass)}>
            {formatSignedEUR(unrealizedPnL)}
          </p>
          {unrealizedPct != null && (
            <p className={cn("text-xs", pnlClass)}>{formatPct(unrealizedPct)}</p>
          )}
        </CardContent>
      </Card>
      <Stat title="Liquidités" value={formatEUR(cash)} />
      <Stat title="Dividendes reçus" value={formatEUR(dividends)} />
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
        <p className="text-xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
