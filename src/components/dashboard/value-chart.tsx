"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactEUR, formatDate, formatEUR, formatSignedEUR } from "@/lib/format";
import type { ValuePoint } from "@/lib/portfolio";
import { downsample } from "@/lib/portfolio";
import { TooltipFrame, axisStyle } from "@/components/charts/chart-tooltip";

const PERIODS = [
  { key: "1A", months: 12 },
  { key: "3A", months: 36 },
  { key: "MAX", months: null },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

function monthTick(date: string): string {
  const [y, m] = date.split("-");
  return `${m}/${y.slice(2)}`;
}

export function ValueChart({ data }: { data: ValuePoint[] }) {
  const [period, setPeriod] = React.useState<PeriodKey>("MAX");

  const filtered = React.useMemo(() => {
    const months = PERIODS.find((p) => p.key === period)?.months;
    let subset = data;
    if (months != null && data.length > 0) {
      const cutoff = new Date();
      cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
      const iso = cutoff.toISOString().slice(0, 10);
      subset = data.filter((p) => p.date >= iso);
    }
    return downsample(subset, 400);
  }, [data, period]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Valeur du portefeuille vs versements</CardTitle>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "outline" : "ghost"}
              onClick={() => setPeriod(p.key)}
            >
              {p.key === "MAX" ? "Max" : p.key}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={monthTick}
                minTickGap={40}
                {...axisStyle}
              />
              <YAxis
                tickFormatter={formatCompactEUR}
                width={58}
                domain={["auto", "auto"]}
                {...axisStyle}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as ValuePoint;
                  return (
                    <TooltipFrame
                      title={formatDate(String(label))}
                      rows={[
                        {
                          color: "var(--chart-1)",
                          label: "Valeur",
                          value: formatEUR(point.value),
                        },
                        {
                          color: "var(--chart-cash)",
                          label: "Versé",
                          value: formatEUR(point.invested),
                        },
                        {
                          label: "Plus-value",
                          value: formatSignedEUR(point.value - point.invested),
                        },
                      ]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Valeur"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#valueFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="invested"
                name="Versé"
                stroke="var(--chart-cash)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-[var(--chart-1)]" aria-hidden />
            Valeur du portefeuille
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 rounded"
              style={{
                background:
                  "repeating-linear-gradient(90deg, var(--chart-cash) 0 5px, transparent 5px 9px)",
              }}
              aria-hidden
            />
            Versements cumulés
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
