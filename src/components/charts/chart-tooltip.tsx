"use client";

// Tooltip commun à tous les graphes Recharts (style surface + hairline).

export function TooltipFrame({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ color?: string; label: string; value: string }>;
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-ink">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-1.5 text-ink-2">
          {row.color && (
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: row.color }}
              aria-hidden
            />
          )}
          <span>{row.label}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums text-ink">
            {row.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export const axisStyle = {
  stroke: "var(--axis)",
  tick: { fill: "var(--muted)", fontSize: 11 },
  tickLine: false as const,
  axisLine: { stroke: "var(--axis)" },
};
