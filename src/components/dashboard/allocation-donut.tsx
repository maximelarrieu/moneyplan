"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/lib/format";
import type { AllocationSlice } from "@/lib/portfolio";
import { TooltipFrame } from "@/components/charts/chart-tooltip";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function colorFor(slice: AllocationSlice, index: number): string {
  return slice.label === "Liquidités" ? "var(--chart-cash)" : COLORS[index % COLORS.length];
}

const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function AllocationDonut({
  slices,
  title = "Répartition",
}: {
  slices: AllocationSlice[];
  title?: string;
}) {
  const reducedMotion = useReducedMotion();
  if (slices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted">
            Rien à répartir pour l’instant — ajoutez un achat ou un versement.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius={55}
                outerRadius={88}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive={!reducedMotion}
              >
                {slices.map((slice, i) => (
                  <Cell key={slice.label} fill={colorFor(slice, i)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const slice = payload[0].payload as AllocationSlice;
                  return (
                    <TooltipFrame
                      title={slice.label}
                      rows={[
                        { label: "Valeur", value: formatEUR(slice.value) },
                        { label: "Poids", value: pctFmt.format(slice.pct) },
                      ]}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-1.5 text-sm">
          {slices.map((slice, i) => (
            <li key={slice.label} className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 shrink-0 rounded-sm"
                style={{ background: colorFor(slice, i) }}
                aria-hidden
              />
              <span className="min-w-0 truncate text-ink-2">{slice.label}</span>
              <span className="ml-auto pl-2 font-medium tabular-nums">
                {pctFmt.format(slice.pct)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
