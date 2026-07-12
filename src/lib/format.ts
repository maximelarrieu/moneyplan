// Formatage centralisé (fr-FR).

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const eurPrecise = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const pct = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const qty = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });

export function formatEUR(value: number): string {
  return eur.format(value);
}

/** Pour les prix unitaires (jusqu'à 4 décimales). */
export function formatPrice(value: number): string {
  return eurPrecise.format(value);
}

export function formatSignedEUR(value: number): string {
  return (value > 0 ? "+" : "") + eur.format(value);
}

export function formatPct(value: number): string {
  return (value > 0 ? "+" : "") + pct.format(value);
}

export function formatQty(value: number): string {
  return qty.format(value);
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Format court pour les axes de graphes : « 9,4 k€ », « 1,2 M€ ». */
export function formatCompactEUR(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€`;
  }
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}
