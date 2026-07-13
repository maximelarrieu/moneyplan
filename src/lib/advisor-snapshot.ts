// Assemble l'état agrégé du patrimoine (base + cours) en un AdvisorInput pur
// pour le moteur de règles. Séparé d'advisor.ts pour garder ce dernier testable
// sans dépendance à la base.

import type { AdvisorInput } from "@/lib/advisor";
import {
  computeCashBalance,
  computeInvested,
  computePositions,
} from "@/lib/portfolio";
import { getLatestPrices } from "@/lib/prices";
import {
  computeEmergencyFund,
  getInstruments,
  getManualInstrumentIds,
  getOrCreateProfile,
  getTransactionsAsc,
  listAccounts,
} from "@/lib/queries";

export function buildAdvisorSnapshot(): AdvisorInput {
  const accounts = listAccounts();
  const instruments = getInstruments();
  const names = new Map(instruments.map((i) => [i.id, i.name]));
  const ids = instruments.map((i) => i.id);
  const manualIds = getManualInstrumentIds();
  const latestPrices = getLatestPrices(ids);

  const profile = getOrCreateProfile();
  const year = new Date().getFullYear();

  let netWorth = 0;
  let hasPEA = false;
  let peaInvested = 0;
  let hasPER = false;
  let perDepositsThisYear = 0;
  const valueByInstrument = new Map<number, number>();
  let investedMarketValue = 0;

  for (const account of accounts) {
    const txs = getTransactionsAsc(account.id);
    if (txs.length === 0) continue;

    const positions = computePositions(txs, latestPrices, manualIds);
    const held = positions.filter((p) => p.held);
    const cash = computeCashBalance(txs);
    netWorth += held.reduce((s, p) => s + p.marketValue, 0) + cash;

    for (const p of held) {
      valueByInstrument.set(
        p.instrumentId,
        (valueByInstrument.get(p.instrumentId) ?? 0) + p.marketValue,
      );
      investedMarketValue += p.marketValue;
    }

    if (account.type === "PEA") {
      hasPEA = true;
      peaInvested += computeInvested(txs);
    }
    if (account.type === "PER") {
      hasPER = true;
      perDepositsThisYear += txs.reduce(
        (s, tx) =>
          tx.type === "DEPOSIT" && tx.date.startsWith(String(year))
            ? s + (tx.amount ?? 0)
            : s,
        0,
      );
    }
  }

  let topPosition: AdvisorInput["topPosition"] = null;
  if (investedMarketValue > 0) {
    let topId = -1;
    let topValue = 0;
    for (const [id, value] of valueByInstrument) {
      if (value > topValue) {
        topValue = value;
        topId = id;
      }
    }
    if (topId !== -1) {
      topPosition = {
        label: names.get(topId) ?? `#${topId}`,
        weight: topValue / investedMarketValue,
      };
    }
  }

  return {
    netWorth,
    emergencyFund: computeEmergencyFund(),
    monthlyIncome: profile.monthlyIncome ?? null,
    monthlyExpenses: profile.monthlyExpenses ?? null,
    emergencyMonthsTarget: profile.emergencyMonthsTarget,
    hasPEA,
    peaInvested,
    hasPER,
    perDepositsThisYear,
    topPosition,
  };
}
