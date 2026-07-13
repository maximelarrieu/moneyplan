// Pré-migration idempotente lancée AVANT `drizzle-kit push` (voir `db:push`).
//
// Pourquoi : sur une base déjà peuplée, `drizzle-kit push` considère l'ajout
// d'une colonne `NOT NULL` comme une perte de données et propose de tronçonner
// la table — même quand la colonne a une valeur par défaut (le diff SQLite de
// drizzle-kit ignore les défauts falsy comme `false`). On applique donc ici
// les ajouts de colonnes additifs à la main, via un `ALTER TABLE ADD COLUMN …
// DEFAULT …` que SQLite applique sans perte aux lignes existantes. Une fois la
// colonne présente, `push` n'a plus que des opérations non destructives
// (créer les nouvelles tables) et ne pose plus de question.
//
// Idempotent : sans effet si la base est neuve (push créera tout) ou déjà à
// jour. RÈGLE : tout futur ajout de colonne NOT NULL sur une table déjà
// peuplée doit être ajouté ici avant `push`.

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const file = path.join(process.cwd(), "data", "moneyplan.db");

// Base neuve : rien à migrer, drizzle-kit push créera le schéma complet.
if (!fs.existsSync(file)) process.exit(0);

const db = new Database(file);
try {
  const tableExists = (name: string) =>
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
      .get(name) != null;

  const columnExists = (table: string, column: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some(
      (c) => c.name === column,
    );

  // v2 : instruments.manual_valuation (fonds €, supports sans cours).
  // Le littéral `DEFAULT false` doit reproduire EXACTEMENT le DDL généré par
  // drizzle (`integer DEFAULT false NOT NULL`) : sinon `push` verrait un écart
  // de défaut, voudrait reconstruire la table et échouerait sur l'index unique.
  if (tableExists("instruments") && !columnExists("instruments", "manual_valuation")) {
    db.exec(
      "ALTER TABLE instruments ADD COLUMN manual_valuation integer DEFAULT false NOT NULL",
    );
    console.log("Pré-migration : colonne instruments.manual_valuation ajoutée.");
  }
} finally {
  db.close();
}
