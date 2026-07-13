import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Jauge du matelas de sécurité : épargne liquide garantie (livrets) vs objectif
 * (nombre de mois de dépenses). Statut par palier, sans rouge/vert seul.
 */
export function EmergencyGauge({
  current,
  monthlyExpenses,
  monthsTarget,
}: {
  current: number;
  monthlyExpenses: number | null;
  monthsTarget: number;
}) {
  const target = monthlyExpenses ? monthlyExpenses * monthsTarget : null;
  const ratio = target && target > 0 ? current / target : null;
  const pct = ratio != null ? Math.min(ratio, 1) : 0;
  const coveredMonths = monthlyExpenses ? current / monthlyExpenses : null;

  let status = "À compléter";
  let barClass = "bg-[var(--chart-3)]";
  if (ratio != null) {
    if (ratio >= 1) {
      status = "Objectif atteint";
      barClass = "bg-[var(--pos)]";
    } else if (ratio >= 0.5) {
      status = "En bonne voie";
      barClass = "bg-[var(--chart-3)]";
    } else {
      status = "À renforcer";
      barClass = "bg-[var(--neg)]";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matelas de sécurité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-serif text-2xl tabular-nums">{formatEUR(current)}</p>
          {target != null && (
            <p className="text-sm text-ink-2">
              / {formatEUR(target)}{" "}
              <span className="text-muted">objectif</span>
            </p>
          )}
        </div>

        {target != null ? (
          <>
            <div
              className="h-2 w-full overflow-hidden bg-ink/8"
              role="progressbar"
              aria-valuenow={Math.round(pct * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression du matelas de sécurité"
            >
              <div className={cn("h-full", barClass)} style={{ width: `${pct * 100}%` }} />
            </div>
            <p className="text-xs text-ink-2">
              <span className="font-medium text-ink">{status}</span>
              {coveredMonths != null &&
                ` — ${coveredMonths.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })} mois de dépenses couverts sur ${monthsTarget}`}
            </p>
          </>
        ) : (
          <p className="text-xs text-ink-2">
            Renseignez vos dépenses mensuelles dans le{" "}
            <Link href="/profil" className="text-accent hover:underline">
              profil
            </Link>{" "}
            pour fixer l’objectif (livrets pris en compte : Livret A, LDD).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
