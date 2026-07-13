/**
 * Parse un montant saisi à la française, en acceptant une addition.
 * Exemples : "2,49" → 2.49 ; "0,99+1,50" → 2.49 ; "1 + 1,5" → 2.5.
 * Renvoie NaN si un terme est vide ou invalide (ex. "1+", "abc").
 * Pas d'eval : découpage manuel + somme.
 */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(/,/g, ".");
  if (cleaned === "") return NaN;
  let sum = 0;
  for (const term of cleaned.split("+")) {
    if (term === "") return NaN; // "+" en trop ou terme vide
    const n = Number(term);
    if (!Number.isFinite(n)) return NaN;
    sum += n;
  }
  return sum;
}
