import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ACCOUNT_TYPE_LABELS } from "@/components/transactions/types";
import { formatEUR } from "@/lib/format";

export interface AccountSummaryRow {
  id: number;
  name: string;
  type: string;
  value: number;
  weight: number;
}

const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function AccountsSummary({ rows }: { rows: AccountSummaryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comptes</CardTitle>
      </CardHeader>
      <Table>
        <THead>
          <TR>
            <TH>Compte</TH>
            <TH>Type</TH>
            <TH className="text-right">Valeur</TH>
            <TH className="text-right">Poids</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.id} className="hover:bg-ink/2">
              <TD>
                <Link
                  href={`/comptes/${row.id}`}
                  className="font-medium text-accent hover:underline"
                >
                  {row.name}
                </Link>
              </TD>
              <TD>
                <Badge>{ACCOUNT_TYPE_LABELS[row.type] ?? row.type}</Badge>
              </TD>
              <TD className="text-right font-medium">{formatEUR(row.value)}</TD>
              <TD className="text-right">{pctFmt.format(row.weight)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
