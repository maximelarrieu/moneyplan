// Conseiller patrimonial : moteur de règles pur (aucune dépendance à la base
// ni au réseau) — testé dans advisor.test.ts. Produit des recommandations
// typées à partir de l'état agrégé du patrimoine et du profil financier.

import { formatEUR } from "./format";

/** Plafond de versements d'un PEA (hors PEA-PME). */
export const PEA_CEILING = 150_000;
/** Plafond de déduction PER usuel : 10 % des revenus professionnels (estimation). */
export const PER_DEDUCTION_RATE = 0.1;
/** Part d'une seule ligne au-delà de laquelle on signale une sur-concentration. */
export const CONCENTRATION_THRESHOLD = 0.4;

export type RecoTone = "action" | "warning" | "good" | "info";

export interface Recommendation {
  id: string;
  tone: RecoTone;
  title: string;
  detail: string;
  href?: string;
}

export interface AdvisorInput {
  /** Patrimoine net total (tous comptes). */
  netWorth: number;
  /** Matelas de sécurité : liquidités des livrets (Livret A, LDD). */
  emergencyFund: number;
  /** Profil (100 % local, optionnel). */
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  emergencyMonthsTarget: number;
  /** PEA : présence + versements nets cumulés (référence du plafond 150 k€). */
  hasPEA: boolean;
  peaInvested: number;
  /** PER : présence + versements de l'année civile en cours. */
  hasPER: boolean;
  perDepositsThisYear: number;
  /** Ligne la plus lourde des placements (part 0–1 de la valeur investie). */
  topPosition: { label: string; weight: number } | null;
}

const TONE_RANK: Record<RecoTone, number> = {
  action: 0,
  warning: 1,
  info: 2,
  good: 3,
};

const pct = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
});

function months(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/**
 * Recommandations classées de la plus actionnable (action) à la plus
 * rassurante (good). Chaque règle est indépendante et déterministe.
 */
export function buildRecommendations(input: AdvisorInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const {
    emergencyFund,
    monthlyIncome,
    monthlyExpenses,
    emergencyMonthsTarget,
    hasPEA,
    peaInvested,
    hasPER,
    perDepositsThisYear,
    topPosition,
  } = input;

  const hasExpenses = monthlyExpenses != null && monthlyExpenses > 0;
  const emergencyTarget = hasExpenses
    ? monthlyExpenses! * emergencyMonthsTarget
    : null;
  const emergencyFull =
    emergencyTarget != null ? emergencyFund >= emergencyTarget : null;

  // 1. Matelas de sécurité vs objectif.
  if (emergencyTarget != null) {
    if (emergencyFund < emergencyTarget) {
      const missing = emergencyTarget - emergencyFund;
      const ratio = emergencyTarget > 0 ? emergencyFund / emergencyTarget : 0;
      recs.push({
        id: "emergency-fund",
        tone: ratio < 0.5 ? "action" : "warning",
        title: "Renforcer le matelas de sécurité",
        detail: `Il manque ${formatEUR(missing)} pour atteindre ${emergencyMonthsTarget} mois de dépenses. Versez en priorité sur un livret (Livret A, LDD) avant d'investir.`,
        href: "/",
      });
    } else {
      const covered = emergencyFund / monthlyExpenses!;
      recs.push({
        id: "emergency-fund-ok",
        tone: "good",
        title: "Matelas de sécurité complet",
        detail: `Vos livrets couvrent ${months(covered)} mois de dépenses (objectif ${emergencyMonthsTarget}). Vous pouvez investir votre épargne sereinement.`,
      });
    }
  } else {
    recs.push({
      id: "profile-missing",
      tone: "info",
      title: "Complétez votre profil",
      detail:
        "Renseignez vos revenus et dépenses mensuels dans le profil pour des conseils chiffrés (matelas de sécurité, capacité d'épargne).",
      href: "/profil",
    });
  }

  // 2. Capacité d'épargne = revenus − dépenses.
  if (monthlyIncome != null && monthlyExpenses != null) {
    const capacity = monthlyIncome - monthlyExpenses;
    if (capacity > 0) {
      if (emergencyFull === false) {
        recs.push({
          id: "savings-to-emergency",
          tone: "info",
          title: "Orienter l'épargne vers le matelas",
          detail: `Capacité d'épargne d'environ ${formatEUR(capacity)} par mois — dirigez-la d'abord vers vos livrets jusqu'à l'objectif du matelas, puis vers l'investissement.`,
        });
      } else {
        recs.push({
          id: "savings-dca",
          tone: "action",
          title: "Continuer le DCA",
          detail: `Capacité d'épargne d'environ ${formatEUR(capacity)} par mois. Matelas assuré : orientez ce montant vers vos investissements (PEA, assurance-vie) de façon régulière.`,
          href: hasPEA ? "/simulation" : "/comptes",
        });
      }
    } else if (capacity < 0) {
      recs.push({
        id: "negative-capacity",
        tone: "warning",
        title: "Dépenses supérieures aux revenus",
        detail: `Vos dépenses dépassent vos revenus d'environ ${formatEUR(-capacity)} par mois. Évitez de puiser dans l'épargne investie ; ajustez le budget avant d'augmenter le DCA.`,
      });
    }
  }

  // 3. PEA : proximité du plafond de versements (150 k€).
  if (hasPEA && peaInvested > 0) {
    if (peaInvested >= PEA_CEILING) {
      recs.push({
        id: "pea-full",
        tone: "warning",
        title: "Plafond PEA atteint",
        detail: `Vous avez versé ${formatEUR(peaInvested)} sur votre PEA (plafond ${formatEUR(PEA_CEILING)}). Pour de nouveaux versements, envisagez une assurance-vie ou un compte-titres.`,
      });
    } else if (peaInvested >= PEA_CEILING * 0.9) {
      recs.push({
        id: "pea-near-full",
        tone: "info",
        title: "PEA proche du plafond",
        detail: `Il reste ${formatEUR(PEA_CEILING - peaInvested)} de versements possibles sur le PEA avant le plafond de ${formatEUR(PEA_CEILING)}.`,
      });
    }
  }

  // 4. PER : marge de déduction fiscale (10 % des revenus, estimation).
  if (hasPER && monthlyIncome != null && monthlyIncome > 0) {
    const ceiling = monthlyIncome * 12 * PER_DEDUCTION_RATE;
    const margin = ceiling - perDepositsThisYear;
    if (margin > 0) {
      recs.push({
        id: "per-margin",
        tone: "info",
        title: "Marge de déduction PER",
        detail: `Vous pouvez encore verser environ ${formatEUR(margin)} sur votre PER cette année dans le plafond de déduction (10 % des revenus, estimation) : ces versements réduisent votre revenu imposable.`,
      });
    } else {
      recs.push({
        id: "per-ceiling",
        tone: "good",
        title: "Plafond de déduction PER utilisé",
        detail: `Vos versements PER de l'année (${formatEUR(perDepositsThisYear)}) atteignent le plafond de déduction estimé (10 % des revenus). Suffisamment versé pour l'avantage fiscal cette année.`,
      });
    }
  }

  // 5. Sur-concentration d'une ligne.
  if (topPosition && topPosition.weight > CONCENTRATION_THRESHOLD) {
    recs.push({
      id: "concentration",
      tone: "warning",
      title: "Portefeuille concentré",
      detail: `« ${topPosition.label} » représente ${pct.format(topPosition.weight)} de vos placements. Une ligne aussi lourde accroît le risque ; envisagez de diversifier vos prochains achats.`,
    });
  }

  return recs.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}
