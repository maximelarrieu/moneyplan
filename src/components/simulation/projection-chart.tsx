"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactEUR, formatEUR } from "@/lib/format";
import { TooltipFrame, axisStyle } from "@/components/charts/chart-tooltip";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";

export interface ProjectionRow {
  month: number;
  valueA: number;
  investedA: number;
  valueB: number;
  investedB: number;
}

export function ProjectionChart({ rows }: { rows: ProjectionRow[] }) {
  const reducedMotion = useReducedMotion();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(m: number) => `${Math.round(m / 12)} ans`}
                ticks={rows
                  .map((r) => r.month)
                  .filter((m) => m > 0 && m % 60 === 0)}
                {...axisStyle}
              />
              <YAxis tickFormatter={formatCompactEUR} width={58} {...axisStyle} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as ProjectionRow;
                  const yearsFloat = row.month / 12;
                  const title =
                    row.month % 12 === 0
                      ? `${yearsFloat} ans`
                      : `${Math.floor(yearsFloat)} ans ${row.month % 12} mois`;
                  return (
                    <TooltipFrame
                      title={title}
                      rows={[
                        {
                          color: "var(--chart-1)",
                          label: "Scénario A",
                          value: formatEUR(row.valueA),
                        },
                        {
                          color: "var(--chart-2)",
                          label: "Scénario B",
                          value: formatEUR(row.valueB),
                        },
                        { label: "Versé A", value: formatEUR(row.investedA) },
                        { label: "Versé B", value: formatEUR(row.investedB) },
                      ]}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="valueA"
                name="Scénario A"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={!reducedMotion}
              />
              <Line
                type="monotone"
                dataKey="valueB"
                name="Scénario B"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={!reducedMotion}
              />
              <Line
                type="monotone"
                dataKey="investedA"
                name="Versé A"
                stroke="var(--chart-1)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeOpacity={0.55}
                dot={false}
                isAnimationActive={!reducedMotion}
              />
              <Line
                type="monotone"
                dataKey="investedB"
                name="Versé B"
                stroke="var(--chart-2)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeOpacity={0.55}
                dot={false}
                isAnimationActive={!reducedMotion}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-[var(--chart-1)]" aria-hidden />
            Scénario A — valeur
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-[var(--chart-2)]" aria-hidden />
            Scénario B — valeur
          </span>
          <span className="text-muted">Pointillés : montants versés</span>
        </div>
      </CardContent>
    </Card>
  );
}
