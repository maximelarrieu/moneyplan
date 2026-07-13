"use server";

import Anthropic from "@anthropic-ai/sdk";
import { buildRecommendations } from "@/lib/advisor";
import { buildAdvisorSnapshot } from "@/lib/advisor-snapshot";
import { formatEUR } from "@/lib/format";

export interface SynthesisResult {
  ok: boolean;
  /** Synthèse rédigée (markdown léger) si ok. */
  text?: string;
  /** Motif d'indisponibilité (clé absente, erreur réseau…). */
  reason?: string;
}

const MODEL = "claude-opus-4-8";

const SYSTEM = `Tu es un conseiller en gestion de patrimoine français, pédagogue et prudent.
On te fournit l'état chiffré du patrimoine d'un particulier et une liste de
recommandations déjà calculées par des règles locales. Ta mission : en faire une
synthèse claire et actionnable en français, en 4 à 6 phrases courtes, qui
priorise les actions et relie les chiffres entre eux (matelas de sécurité,
capacité d'épargne, plafonds PEA/PER, diversification).

Contraintes :
- Ne recommande jamais de produit financier précis ni de gérant.
- Reste général : rappelle que ce n'est pas un conseil en investissement
  personnalisé et que la fiscalité doit être vérifiée.
- N'invente aucun chiffre : n'utilise que ceux fournis.
- Ton sobre, tutoiement, pas d'emojis, pas de titres, du texte suivi.`;

/**
 * Synthèse IA optionnelle des recommandations. Activée seulement si la variable
 * d'environnement ANTHROPIC_API_KEY est présente ; sinon renvoie ok:false sans
 * appel réseau. Les données ne quittent la machine que sur cette action explicite.
 */
export async function synthesizeAdvice(): Promise<SynthesisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      reason:
        "Synthèse IA désactivée : aucune clé ANTHROPIC_API_KEY configurée. Les conseils ci-dessus restent calculés localement.",
    };
  }

  const snapshot = buildAdvisorSnapshot();
  const recommendations = buildRecommendations(snapshot);

  const facts = [
    `Patrimoine net : ${formatEUR(snapshot.netWorth)}`,
    `Matelas de sécurité (livrets) : ${formatEUR(snapshot.emergencyFund)}`,
    snapshot.monthlyIncome != null
      ? `Revenus mensuels : ${formatEUR(snapshot.monthlyIncome)}`
      : "Revenus mensuels : non renseignés",
    snapshot.monthlyExpenses != null
      ? `Dépenses mensuelles : ${formatEUR(snapshot.monthlyExpenses)}`
      : "Dépenses mensuelles : non renseignées",
    `Objectif de matelas : ${snapshot.emergencyMonthsTarget} mois de dépenses`,
    snapshot.hasPEA
      ? `PEA — versements cumulés : ${formatEUR(snapshot.peaInvested)} (plafond 150 000 €)`
      : "Pas de PEA",
    snapshot.hasPER
      ? `PER — versements de l'année : ${formatEUR(snapshot.perDepositsThisYear)}`
      : "Pas de PER",
    snapshot.topPosition
      ? `Ligne la plus lourde : ${snapshot.topPosition.label} (${Math.round(snapshot.topPosition.weight * 100)} % des placements)`
      : "Aucune position de marché",
  ].join("\n");

  const rules = recommendations
    .map((r) => `- [${r.tone}] ${r.title} : ${r.detail}`)
    .join("\n");

  const prompt = `Voici l'état du patrimoine :\n${facts}\n\nRecommandations calculées localement :\n${rules}\n\nRédige la synthèse.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!text) {
      return { ok: false, reason: "La synthèse est revenue vide. Réessayez." };
    }
    return { ok: true, text };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "erreur inconnue";
    return {
      ok: false,
      reason: `Impossible de contacter le service de synthèse (${detail}). Les conseils locaux restent valables.`,
    };
  }
}
