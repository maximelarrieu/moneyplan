import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatEUR, formatPct, formatPrice, formatQty, formatSignedEUR } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PositionRow {
  instrumentId: number;
  symbol: string;
  name: string;
  quantity: number;
  pru: number | null;
  lastPrice: number | null;
  marketValue: number;
  unrealizedPnL: number | null;
  unrealizedPct: number | null;
  weight: number;
}

const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function PositionsTable({ rows }: { rows: PositionRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Positions</CardTitle>
      </CardHeader>
      <Table>
        <THead>
          <TR>
            <TH>Instrument</TH>
            <TH className="text-right">Quantité</TH>
            <TH className="text-right">PRU</TH>
            <TH className="text-right">Dernier cours</TH>
            <TH className="text-right">Valeur</TH>
            <TH className="text-right">± value</TH>
            <TH className="text-right">Poids</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.instrumentId} className="hover:bg-ink/2">
              <TD>
                <Link
                  href={`/positions/${row.instrumentId}`}
                  className="font-medium text-accent hover:underline"
                  title="Voir le cours, le PRU et les achats DCA"
                  translate="no"
                >
                  {row.symbol}
                </Link>
                <span className="ml-2 hidden text-xs text-muted md:inline">
                  {row.name}
                </span>
              </TD>
              <TD className="text-right">{formatQty(row.quantity)}</TD>
              <TD className="text-right">{row.pru != null ? formatPrice(row.pru) : "—"}</TD>
              <TD className="text-right">
                {row.lastPrice != null ? formatPrice(row.lastPrice) : "—"}
              </TD>
              <TD className="text-right font-medium">{formatEUR(row.marketValue)}</TD>
              <TD className="text-right">
                {row.unrealizedPnL != null ? (
                  <span
                    className={cn(
                      "font-medium",
                      row.unrealizedPnL >= 0 ? "text-pos" : "text-neg",
                    )}
                  >
                    {formatSignedEUR(row.unrealizedPnL)}
                    {row.unrealizedPct != null && (
                      <span className="ml-1 text-xs">
                        ({formatPct(row.unrealizedPct)})
                      </span>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </TD>
              <TD className="text-right">{pctFmt.format(row.weight)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
