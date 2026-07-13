import { formatDate, formatEUR, formatPct, formatSignedEUR } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * En-tête éditorial : le chiffre-clé en pleine page plutôt qu'une rangée
 * de cartes KPI. Les métriques secondaires vivent sur une ligne de rappel.
 */
export function DashboardHero({
  totalValue,
  invested,
  unrealizedPnL,
  unrealizedPct,
  cash,
  dividends,
  lastPriceDate,
}: {
  totalValue: number;
  invested: number;
  unrealizedPnL: number;
  unrealizedPct: number | null;
  cash: number;
  dividends: number;
  lastPriceDate: string | null;
}) {
  const pnlClass = unrealizedPnL >= 0 ? "text-pos" : "text-neg";
  return (
    <section aria-label="Synthèse du portefeuille">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        Valeur du portefeuille
        {lastPriceDate && (
          <span className="ml-2 normal-case tracking-normal">
            — cours du {formatDate(lastPriceDate)}
          </span>
        )}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <p className="font-serif text-5xl tracking-tight tabular-nums md:text-6xl">
          {formatEUR(totalValue)}
        </p>
        <p className={cn("font-serif text-2xl tabular-nums", pnlClass)}>
          {formatSignedEUR(unrealizedPnL)}
          {unrealizedPct != null && (
            <span className="ml-2 text-base">({formatPct(unrealizedPct)})</span>
          )}
        </p>
      </div>
      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-edge pt-4">
        <Metric label="Versé" value={formatEUR(invested)} />
        <Metric label="Liquidités" value={formatEUR(cash)} />
        <Metric label="Dividendes reçus" value={formatEUR(dividends)} />
      </dl>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg tabular-nums text-ink">{value}</dd>
    </div>
  );
}
