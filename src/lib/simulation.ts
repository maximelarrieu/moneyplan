// Projection DCA : fonctions pures, testées dans simulation.test.ts.

export interface ProjectionInput {
  initial: number;
  monthly: number;
  annualReturnPct: number;
  years: number;
}

export interface ProjectionPoint {
  month: number;
  value: number;
  contributed: number;
}

/** Taux mensuel équivalent à un rendement annualisé (composition mensuelle). */
export function monthlyRate(annualReturnPct: number): number {
  return Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
}

/**
 * Projection mois par mois : V(n+1) = V(n)·(1+rM) + C (versement en fin de mois).
 * Le point 0 est la situation de départ.
 */
export function project({
  initial,
  monthly,
  annualReturnPct,
  years,
}: ProjectionInput): ProjectionPoint[] {
  const rM = monthlyRate(annualReturnPct);
  const points: ProjectionPoint[] = [
    { month: 0, value: initial, contributed: initial },
  ];
  let value = initial;
  let contributed = initial;
  for (let m = 1; m <= Math.round(years * 12); m++) {
    value = value * (1 + rM) + monthly;
    contributed += monthly;
    points.push({
      month: m,
      value: Math.round(value * 100) / 100,
      contributed: Math.round(contributed * 100) / 100,
    });
  }
  return points;
}
