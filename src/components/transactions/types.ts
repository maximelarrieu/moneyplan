// Formes sérialisables passées des Server Components aux composants client.

export const TX_TYPE_LABELS: Record<string, string> = {
  BUY: "Achat",
  SELL: "Vente",
  DIVIDEND: "Dividende",
  DEPOSIT: "Versement",
  WITHDRAWAL: "Retrait",
  FEE: "Frais",
  REFUND: "Remboursement de frais",
  RETURN_OF_CAPITAL: "Remboursement de capital",
  INTEREST: "Intérêts",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  PEA: "PEA",
  CTO: "Compte-titres",
  ASSURANCE_VIE: "Assurance-vie",
  PER: "PER",
  PEE: "PEE",
  LDD: "LDD",
  LIVRET_A: "Livret A",
  AUTRE: "Autre",
};

/** Aide affichée sous le sélecteur de type au moment de la saisie. */
export const TX_TYPE_HINTS: Record<string, string> = {
  BUY: "Achat de titres — le prix payé nourrit le PRU.",
  SELL: "Vente de titres — réalise une plus ou moins-value.",
  DIVIDEND: "Revenu versé par le titre (coupon) — compté en dividendes reçus.",
  DEPOSIT: "Espèces déposées sur le compte — comptent dans le montant investi.",
  WITHDRAWAL: "Espèces retirées du compte.",
  FEE: "Frais prélevés (tenue de compte, droits de garde…).",
  REFUND:
    "Crédit de liquidités sans lien avec un titre (ex. frais trop perçus remboursés).",
  RETURN_OF_CAPITAL:
    "Remboursement d’une partie de la mise sur un titre — réduit son PRU (n’est pas un revenu).",
  INTEREST: "Intérêts d’un livret — crédités au cash, comptés en gain (hors montant investi).",
};

export interface InstrumentOption {
  id: number;
  symbol: string;
  name: string;
  manualValuation?: boolean;
}

export type TxTypeKey =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "FEE"
  | "REFUND"
  | "RETURN_OF_CAPITAL"
  | "INTEREST";

export interface TxRow {
  id: number;
  type: TxTypeKey;
  date: string;
  quantity: number | null;
  unitPrice: number | null;
  fees: number;
  amount: number | null;
  note: string | null;
  instrumentId: number | null;
  instrumentSymbol: string | null;
  instrumentName: string | null;
}
