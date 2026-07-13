// Formes sérialisables passées des Server Components aux composants client.

export const TX_TYPE_LABELS: Record<string, string> = {
  BUY: "Achat",
  SELL: "Vente",
  DIVIDEND: "Dividende",
  DEPOSIT: "Versement",
  WITHDRAWAL: "Retrait",
  FEE: "Frais",
  REFUND: "Remboursement",
};

export interface InstrumentOption {
  id: number;
  symbol: string;
  name: string;
}

export interface TxRow {
  id: number;
  type: "BUY" | "SELL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAWAL" | "FEE" | "REFUND";
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
