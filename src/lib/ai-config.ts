// Configuration IA (server-only). La clé Gemini est lue depuis un fichier de
// configuration git-ignoré (`moneyplan.config.json` à la racine) pour ne jamais
// la committer. Repli optionnel sur les variables d'environnement.

import fs from "node:fs";
import path from "node:path";

export interface AiConfig {
  geminiApiKey?: string;
  geminiModel: string;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Lit `moneyplan.config.json` (racine du projet). Fichier absent ou JSON
 * invalide → config sans clé (jamais d'exception). Les variables d'env
 * GEMINI_API_KEY / GEMINI_MODEL servent de repli.
 */
export function getAiConfig(): AiConfig {
  let fromFile: { geminiApiKey?: unknown; geminiModel?: unknown } = {};
  try {
    const file = path.join(process.cwd(), "moneyplan.config.json");
    if (fs.existsSync(file)) {
      fromFile = JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {
    // Fichier illisible ou JSON malformé : on ignore et on retombe sur l'env.
  }

  const key =
    (typeof fromFile.geminiApiKey === "string" && fromFile.geminiApiKey.trim()) ||
    process.env.GEMINI_API_KEY?.trim() ||
    undefined;
  const model =
    (typeof fromFile.geminiModel === "string" && fromFile.geminiModel.trim()) ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_MODEL;

  return { geminiApiKey: key, geminiModel: model };
}

export function isAiAvailable(): boolean {
  return Boolean(getAiConfig().geminiApiKey);
}
