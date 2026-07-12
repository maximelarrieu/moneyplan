"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatEUR, formatSignedEUR } from "@/lib/format";
import { project } from "@/lib/simulation";
import { ProjectionChart, type ProjectionRow } from "./projection-chart";

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  step = 10,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {suffix ? ` (${suffix})` : ""}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function SimulationClient({
  defaultInitial,
  defaultMonthly,
}: {
  defaultInitial: number;
  defaultMonthly: number;
}) {
  const [initial, setInitial] = React.useState(defaultInitial);
  const [monthlyA, setMonthlyA] = React.useState(defaultMonthly);
  const [monthlyB, setMonthlyB] = React.useState(defaultMonthly + 200);
  const [returnPct, setReturnPct] = React.useState(7);
  const [years, setYears] = React.useState(20);

  const { rows, milestones } = React.useMemo(() => {
    const safeYears = Math.min(Math.max(years || 1, 1), 50);
    const a = project({ initial, monthly: monthlyA, annualReturnPct: returnPct, years: safeYears });
    const b = project({ initial, monthly: monthlyB, annualReturnPct: returnPct, years: safeYears });
    const rows: ProjectionRow[] = a.map((pa, i) => ({
      month: pa.month,
      valueA: pa.value,
      investedA: pa.contributed,
      valueB: b[i]?.value ?? pa.value,
      investedB: b[i]?.contributed ?? pa.contributed,
    }));
    const milestoneYears = [5, 10, 15, 20, 25, 30, 40, 50].filter((y) => y <= safeYears);
    if (!milestoneYears.includes(safeYears)) milestoneYears.push(safeYears);
    const milestones = milestoneYears.map((y) => rows[y * 12]).filter(Boolean);
    return { rows, milestones };
  }, [initial, monthlyA, monthlyB, returnPct, years]);

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl tracking-tight">Simulation DCA</h1>
      <p className="max-w-2xl text-sm text-ink-2">
        Comparez votre rythme d’investissement actuel (scénario A) à un rythme
        augmenté (scénario B), à rendement annualisé constant. Projection
        indicative, composée mensuellement — les marchés ne montent pas en ligne
        droite.
      </p>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-5">
          <NumberField
            id="sim-initial"
            label="Capital de départ"
            suffix="€"
            value={initial}
            onChange={setInitial}
            step={100}
          />
          <NumberField
            id="sim-monthly-a"
            label="DCA actuel — A"
            suffix="€/mois"
            value={monthlyA}
            onChange={setMonthlyA}
          />
          <NumberField
            id="sim-monthly-b"
            label="DCA augmenté — B"
            suffix="€/mois"
            value={monthlyB}
            onChange={setMonthlyB}
          />
          <NumberField
            id="sim-return"
            label="Rendement annuel"
            suffix="%"
            value={returnPct}
            onChange={setReturnPct}
            step={0.5}
          />
          <NumberField
            id="sim-years"
            label="Horizon"
            suffix="ans"
            value={years}
            onChange={setYears}
            min={1}
            step={1}
          />
        </CardContent>
      </Card>

      <ProjectionChart rows={rows} />

      <Card>
        <CardHeader>
          <CardTitle>Jalons</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Horizon</TH>
              <TH className="text-right">Versé A</TH>
              <TH className="text-right">Valeur A</TH>
              <TH className="text-right">Versé B</TH>
              <TH className="text-right">Valeur B</TH>
              <TH className="text-right">Écart B − A</TH>
            </TR>
          </THead>
          <TBody>
            {milestones.map((m) => (
              <TR key={m.month}>
                <TD className="font-medium">{m.month / 12} ans</TD>
                <TD className="text-right">{formatEUR(m.investedA)}</TD>
                <TD className="text-right font-medium">{formatEUR(m.valueA)}</TD>
                <TD className="text-right">{formatEUR(m.investedB)}</TD>
                <TD className="text-right font-medium">{formatEUR(m.valueB)}</TD>
                <TD className="text-right font-medium text-pos">
                  {formatSignedEUR(m.valueB - m.valueA)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
