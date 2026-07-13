// Cœur métier : fonctions pures (aucune dépendance à la base) — testées dans portfolio.test.ts.

export type TxType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "FEE"
  | "REFUND"
  | "RETURN_OF_CAPITAL"
  | "INTEREST";

export interface Tx {
  instrumentId: number | null;
  type: TxType;
  date: string; // YYYY-MM-DD
  quantity: number | null;
  unitPrice: number | null;
  fees: number;
  amount: number | null;
}

export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface Position {
  instrumentId: number;
  quantity: number;
  costBasis: number;
  pru: number | null;
  lastPrice: number | null;
  lastPriceDate: string | null;
  marketValue: number;
  unrealizedPnL: number | null;
  unrealizedPct: number | null;
  realizedPnL: number;
  dividends: number;
  held: boolean; // position en cours (à valoriser/afficher)
  manual: boolean; // valorisation manuelle (fonds €…) — pas de PRU ni de cours de marché
}

export interface ValuePoint {
  date: string;
  value: number; // titres + liquidités
  invested: number; // versements nets cumulés
  cash: number;
}

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
}

/** Impact d'une transaction sur les liquidités du compte. */
export function cashDelta(tx: Tx): number {
  switch (tx.type) {
    case "DEPOSIT":
    case "DIVIDEND":
    case "REFUND": // crédité au cash mais hors « montant investi »
    case "RETURN_OF_CAPITAL": // crédité au cash ; l'effet PRU est traité par position
    case "INTEREST": // intérêts de livret : crédit au cash, compté en gain
      return tx.amount ?? 0;
    case "WITHDRAWAL":
    case "FEE":
      return -(tx.amount ?? 0);
    // BUY/SELL : titres cotés (quantité × prix) ou support à valorisation
    // manuelle (montant), selon la forme de la transaction.
    case "BUY":
      return isAmountTrade(tx)
        ? -((tx.amount ?? 0) + tx.fees)
        : -((tx.quantity ?? 0) * (tx.unitPrice ?? 0) + tx.fees);
    case "SELL":
      return isAmountTrade(tx)
        ? (tx.amount ?? 0) - tx.fees
        : (tx.quantity ?? 0) * (tx.unitPrice ?? 0) - tx.fees;
  }
}

/** Une transaction titre saisie en montant (support à valorisation manuelle). */
function isAmountTrade(tx: Tx): boolean {
  return tx.quantity == null && tx.unitPrice == null;
}

export function computeCashBalance(txs: Tx[]): number {
  return txs.reduce((sum, tx) => sum + cashDelta(tx), 0);
}

/** Montant investi = versements nets (référence fiscale du PEA). */
export function computeInvested(txs: Tx[]): number {
  return txs.reduce((sum, tx) => {
    if (tx.type === "DEPOSIT") return sum + (tx.amount ?? 0);
    if (tx.type === "WITHDRAWAL") return sum - (tx.amount ?? 0);
    return sum;
  }, 0);
}

/** Intérêts perçus (livrets) — gain, hors montant investi. */
export function computeInterest(txs: Tx[]): number {
  return txs.reduce(
    (sum, tx) => (tx.type === "INTEREST" ? sum + (tx.amount ?? 0) : sum),
    0,
  );
}

const EPSILON = 1e-9;

/**
 * Positions par instrument, méthode du coût moyen (PRU, convention française).
 * Les transactions doivent être triées par date croissante.
 * Retourne aussi les positions soldées (quantity ≈ 0) pour le réalisé/dividendes.
 */
export function computePositions(
  txs: Tx[],
  latestPrices: Map<number, PricePoint>,
  manualIds: Set<number> = new Set(),
): Position[] {
  const acc = new Map<
    number,
    { quantity: number; costBasis: number; realizedPnL: number; dividends: number }
  >();

  for (const tx of txs) {
    if (tx.instrumentId == null) continue;
    let p = acc.get(tx.instrumentId);
    if (!p) {
      p = { quantity: 0, costBasis: 0, realizedPnL: 0, dividends: 0 };
      acc.set(tx.instrumentId, p);
    }
    const manual = manualIds.has(tx.instrumentId);
    if (tx.type === "BUY") {
      if (manual) {
        // Support à valorisation manuelle : contribution saisie en montant.
        p.costBasis += (tx.amount ?? 0) + tx.fees;
      } else {
        p.quantity += tx.quantity ?? 0;
        p.costBasis += (tx.quantity ?? 0) * (tx.unitPrice ?? 0) + tx.fees;
      }
    } else if (tx.type === "SELL") {
      if (manual) {
        // Rachat en montant : réduit le contribué ; l'excédent est réalisé.
        const amount = tx.amount ?? 0;
        const reduction = Math.min(amount, p.costBasis);
        p.costBasis -= reduction;
        p.realizedPnL += amount - reduction - tx.fees;
      } else {
        const q = tx.quantity ?? 0;
        const pru = p.quantity > EPSILON ? p.costBasis / p.quantity : 0;
        p.realizedPnL += q * ((tx.unitPrice ?? 0) - pru) - tx.fees;
        p.costBasis -= q * pru;
        p.quantity -= q;
        if (p.quantity < EPSILON) {
          p.quantity = 0;
          p.costBasis = 0;
        }
      }
    } else if (tx.type === "DIVIDEND") {
      p.dividends += tx.amount ?? 0;
    } else if (tx.type === "RETURN_OF_CAPITAL") {
      // Remboursement d'apport : réduit le coût de revient (donc le PRU).
      // Au-delà du coût restant, l'excédent est une plus-value réalisée
      // (même logique que le traitement fiscal).
      const amount = tx.amount ?? 0;
      const reduction = Math.min(amount, p.costBasis);
      p.costBasis -= reduction;
      p.realizedPnL += amount - reduction;
    }
  }

  return [...acc.entries()].map(([instrumentId, p]) => {
    const latest = latestPrices.get(instrumentId) ?? null;
    const manual = manualIds.has(instrumentId);

    if (manual) {
      // Valeur = dernière valorisation manuelle (close = valeur totale),
      // sinon le contribué. Pas de PRU ni de quantité de parts.
      const held = p.costBasis > EPSILON || (latest?.close ?? 0) > EPSILON;
      const marketValue = held ? (latest ? latest.close : p.costBasis) : 0;
      const unrealizedPnL = held && latest ? marketValue - p.costBasis : null;
      const unrealizedPct =
        unrealizedPnL != null && p.costBasis > EPSILON
          ? unrealizedPnL / p.costBasis
          : null;
      return {
        instrumentId,
        quantity: 0,
        costBasis: p.costBasis,
        pru: null,
        lastPrice: latest?.close ?? null,
        lastPriceDate: latest?.date ?? null,
        marketValue,
        unrealizedPnL,
        unrealizedPct,
        realizedPnL: p.realizedPnL,
        dividends: p.dividends,
        held,
        manual: true,
      };
    }

    const held = p.quantity > EPSILON;
    const pru = held ? p.costBasis / p.quantity : null;
    const marketValue = held && latest ? p.quantity * latest.close : held ? p.costBasis : 0;
    const unrealizedPnL = held && latest ? marketValue - p.costBasis : null;
    const unrealizedPct =
      unrealizedPnL != null && p.costBasis > EPSILON
        ? unrealizedPnL / p.costBasis
        : null;
    return {
      instrumentId,
      quantity: p.quantity,
      costBasis: p.costBasis,
      pru,
      lastPrice: latest?.close ?? null,
      lastPriceDate: latest?.date ?? null,
      marketValue,
      unrealizedPnL,
      unrealizedPct,
      realizedPnL: p.realizedPnL,
      dividends: p.dividends,
      held,
      manual: false,
    };
  });
}

function* dayRange(from: string, to: string): Generator<string> {
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d.getTime() <= end.getTime()) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

/**
 * Série quotidienne { valeur, investi, liquidités } de la première transaction à `today`.
 * Les prix sont forward-fillés (week-ends, jours fériés) ; avant la première cotation
 * connue, on retombe sur le PRU du moment pour éviter un trou en début de série.
 */
export function computeValueSeries(
  txs: Tx[],
  priceHistories: Map<number, PricePoint[]>,
  today: string,
  manualIds: Set<number> = new Set(),
): ValuePoint[] {
  if (txs.length === 0) return [];
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const start = sorted[0].date;
  if (start > today) return [];

  const holdings = new Map<number, { quantity: number; costBasis: number }>();
  const cursors = new Map<number, { idx: number; lastClose: number | null }>();
  for (const id of priceHistories.keys()) cursors.set(id, { idx: 0, lastClose: null });

  let cash = 0;
  let invested = 0;
  let txIdx = 0;
  const out: ValuePoint[] = [];

  for (const day of dayRange(start, today)) {
    while (txIdx < sorted.length && sorted[txIdx].date <= day) {
      const tx = sorted[txIdx++];
      cash += cashDelta(tx);
      if (tx.type === "DEPOSIT") invested += tx.amount ?? 0;
      if (tx.type === "WITHDRAWAL") invested -= tx.amount ?? 0;
      if (
        tx.instrumentId != null &&
        (tx.type === "BUY" || tx.type === "SELL" || tx.type === "RETURN_OF_CAPITAL")
      ) {
        let h = holdings.get(tx.instrumentId);
        if (!h) {
          h = { quantity: 0, costBasis: 0 };
          holdings.set(tx.instrumentId, h);
        }
        const manual = manualIds.has(tx.instrumentId);
        const q = tx.quantity ?? 0;
        if (tx.type === "BUY") {
          if (manual) {
            h.costBasis += (tx.amount ?? 0) + tx.fees;
          } else {
            h.quantity += q;
            h.costBasis += q * (tx.unitPrice ?? 0) + tx.fees;
          }
        } else if (tx.type === "SELL") {
          if (manual) {
            h.costBasis -= Math.min(tx.amount ?? 0, h.costBasis);
          } else {
            const pru = h.quantity > EPSILON ? h.costBasis / h.quantity : 0;
            h.costBasis -= q * pru;
            h.quantity -= q;
            if (h.quantity < EPSILON) {
              h.quantity = 0;
              h.costBasis = 0;
            }
          }
        } else {
          // RETURN_OF_CAPITAL
          h.costBasis -= Math.min(tx.amount ?? 0, h.costBasis);
        }
      }
    }

    let value = cash;
    for (const [id, h] of holdings) {
      const history = priceHistories.get(id) ?? [];
      const cursor = cursors.get(id) ?? { idx: 0, lastClose: null };
      while (cursor.idx < history.length && history[cursor.idx].date <= day) {
        cursor.lastClose = history[cursor.idx].close;
        cursor.idx++;
      }
      cursors.set(id, cursor);
      if (manualIds.has(id)) {
        // Valorisation manuelle = valeur totale forward-fillée, sinon contribué.
        const v = cursor.lastClose ?? h.costBasis;
        if (v > EPSILON) value += v;
      } else {
        if (h.quantity <= EPSILON) continue;
        const price = cursor.lastClose ?? h.costBasis / h.quantity; // fallback PRU
        value += h.quantity * price;
      }
    }

    out.push({
      date: day,
      value: round2(value),
      invested: round2(invested),
      cash: round2(cash),
    });
  }
  return out;
}

/**
 * Somme plusieurs séries de valeur (une par compte) sur une grille de dates
 * commune, de la première transaction tous comptes confondus à `today`.
 */
export function aggregateValueSeries(
  seriesList: ValuePoint[][],
  today: string,
): ValuePoint[] {
  const nonEmpty = seriesList.filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return [];
  const maps = nonEmpty.map((s) => new Map(s.map((p) => [p.date, p])));
  const start = nonEmpty.reduce(
    (min, s) => (s[0].date < min ? s[0].date : min),
    nonEmpty[0][0].date,
  );
  const out: ValuePoint[] = [];
  for (const day of dayRange(start, today)) {
    let value = 0;
    let invested = 0;
    let cash = 0;
    for (const m of maps) {
      const p = m.get(day);
      if (p) {
        value += p.value;
        invested += p.invested;
        cash += p.cash;
      }
    }
    out.push({ date: day, value: round2(value), invested: round2(invested), cash: round2(cash) });
  }
  return out;
}

export function computeAllocation(
  positions: Position[],
  cash: number,
  names: Map<number, string>,
): AllocationSlice[] {
  const held = positions.filter((p) => p.held);
  const total = held.reduce((s, p) => s + p.marketValue, 0) + Math.max(cash, 0);
  if (total <= EPSILON) return [];
  const slices = held
    .map((p) => ({
      label: names.get(p.instrumentId) ?? `#${p.instrumentId}`,
      value: round2(p.marketValue),
      pct: p.marketValue / total,
    }))
    .sort((a, b) => b.value - a.value);
  if (cash > EPSILON) {
    slices.push({ label: "Liquidités", value: round2(cash), pct: cash / total });
  }
  return slices;
}

/** Répartition à partir de valeurs libellées (par compte, par type…). */
export function allocationFromValues(
  entries: Array<{ label: string; value: number }>,
): AllocationSlice[] {
  const positive = entries.filter((e) => e.value > EPSILON);
  const total = positive.reduce((s, e) => s + e.value, 0);
  if (total <= EPSILON) return [];
  return positive
    .map((e) => ({ label: e.label, value: round2(e.value), pct: e.value / total }))
    .sort((a, b) => b.value - a.value);
}

/** Sous-échantillonne une série pour l'affichage en conservant le dernier point. */
export function downsample<T>(series: T[], maxPoints: number): T[] {
  if (series.length <= maxPoints) return series;
  const step = Math.ceil(series.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < series.length; i += step) out.push(series[i]);
  if (out[out.length - 1] !== series[series.length - 1]) {
    out.push(series[series.length - 1]);
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
