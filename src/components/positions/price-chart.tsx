"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPrice } from "@/lib/format";
import { downsample } from "@/lib/portfolio";
import { TooltipFrame, axisStyle } from "@/components/charts/chart-tooltip";
import { useReducedMotion } from "@/components/charts/use-reduced-motion";

export interface PricePointWithBuy {
  date: string;
  close: number;
  buy?: number;
}

function monthTick(date: string): string {
  const [y, m] = date.split("-");
  return `${m}/${y.slice(2)}`;
}

export function PriceChart({
  data,
  pru,
}: {
  data: PricePointWithBuy[];
  pru: number | null;
}) {
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted">
            Aucun cours en cache. Si la bannière du tableau de bord signale une
            erreur HTTP 404, le ticker Yahoo est probablement erroné — corrigez-le
            via le bouton « Modifier » ci-dessus (ex. ENGI.PA pour Euronext
            Paris). Sinon, les cours seront récupérés au prochain chargement du
            tableau de bord.
          </p>
        </CardContent>
      </Card>
    );
  }

  // On garde tous les points porteurs d'un achat lors du sous-échantillonnage.
  const sampled = downsample(data.filter((p) => p.buy == null), 350)
    .concat(data.filter((p) => p.buy != null))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cours et PRU</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={sampled} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={monthTick} minTickGap={40} {...axisStyle} />
              <YAxis
                tickFormatter={(v: number) => formatPrice(v)}
                width={70}
                domain={["auto", "auto"]}
                {...axisStyle}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as PricePointWithBuy;
                  const rows = [
                    {
                      color: "var(--chart-1)",
                      label: "Cours",
                      value: formatPrice(point.close),
                    },
                  ];
                  if (point.buy != null) {
                    rows.push({
                      color: "var(--chart-3)",
                      label: "Achat à",
                      value: formatPrice(point.buy),
                    });
                  }
                  return <TooltipFrame title={formatDate(String(label))} rows={rows} />;
                }}
              />
              {pru != null && (
                <ReferenceLine
                  y={pru}
                  stroke="var(--muted)"
                  strokeDasharray="5 4"
                  label={{
                    value: `PRU ${formatPrice(pru)}`,
                    position: "insideBottomRight",
                    fill: "var(--muted)",
                    fontSize: 11,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="close"
                name="Cours"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={!reducedMotion}
              />
              <Scatter
                dataKey="buy"
                name="Achats"
                fill="var(--chart-3)"
                stroke="var(--surface)"
                strokeWidth={2}
                shape="circle"
                isAnimationActive={!reducedMotion}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-[var(--chart-1)]" aria-hidden />
            Cours de clôture
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-[var(--chart-3)]" aria-hidden />
            Achats DCA
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 rounded"
              style={{
                background:
                  "repeating-linear-gradient(90deg, var(--muted) 0 5px, transparent 5px 9px)",
              }}
              aria-hidden
            />
            PRU
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
