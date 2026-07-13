# MoneyPlan

Suivi de PEA et de DCA mensuel : positions, PRU, plus-values, dividendes,
graphes dans le temps et simulation de scénarios d'investissement.

App web locale — vos données restent dans un fichier SQLite sur votre machine.

## Démarrage

```bash
npm install
npm run db:push        # crée data/moneyplan.db
npm run seed           # optionnel : données de démonstration (18 mois de DCA)
npm run dev            # http://localhost:3000
```

Au premier chargement du tableau de bord, les cours des instruments sont
récupérés via l'API Yahoo Finance (sans clé) puis mis en cache en base ; la
synchronisation est rejouée au plus toutes les 6 h, ou à la demande via le
bouton « Actualiser les cours ». Hors connexion, l'app fonctionne sur le
cache et affiche une bannière.

Pour repartir de zéro (vos vraies données) : supprimez `data/moneyplan.db`,
relancez `npm run db:push`, puis saisissez vos transactions.

## Utilisation

- **Transactions** — saisissez versements, achats, ventes, dividendes, retraits
  et frais. À l'achat, une case (cochée par défaut) crée automatiquement le
  versement correspondant : le flux DCA « versement → achat » se saisit en une
  fois. Les instruments se créent à la volée (ticker Yahoo, ex. `WPEA.PA`,
  `ESE.PA`, `TTE.PA`).
- **Tableau de bord** — valeur totale, montant investi, plus-value latente,
  liquidités, dividendes ; graphe valeur vs versements cumulés (1A/3A/Max) ;
  répartition ; table des positions (PRU, dernier cours, ± value, poids).
- **Détail d'une position** — cours historique avec ligne de PRU et marqueurs
  des achats DCA, historique des opérations.
- **Simulation** — projetez votre portefeuille en comparant votre DCA actuel à
  un DCA augmenté (rendement annualisé et horizon paramétrables), avec jalons
  à 5/10/15/20 ans.

## Où saisir les écritures de mon relevé ?

Correspondance avec les libellés habituels des relevés de courtiers
(exemples Crédit Agricole Bourse) :

| Écriture du relevé | Catégorie MoneyPlan | Remarque |
| --- | --- | --- |
| Achat / souscription | **Achat** | La case « créer aussi le versement » couvre le flux DCA versement → achat |
| Vente / cession | **Vente** | |
| « Paiement de coupon » sur une action | **Dividende** (avec l'instrument) | |
| « RBT de capital / distrib. +values » | **Remboursement de capital** (avec l'instrument) | Réduit le coût de revient (donc le PRU) au lieu de compter comme revenu — le traitement fiscal exact. Si le remboursement dépasse le coût restant, l'excédent est comptabilisé en plus-value réalisée |
| « Taxe transactions financières » (TTF) | À **additionner au champ Frais de l'achat** concerné | Elle fait partie du coût d'acquisition → PRU exact. Le champ Frais accepte une somme : tapez `courtage+TTF`, ex. `0,99+1,50`. (Une catégorie « Frais » séparée sous-évaluerait le PRU) |
| Versement d'espèces vers le PEA | **Versement** | C'est la référence du « montant investi » (plafond PEA) |
| Retrait d'espèces | **Retrait** | |
| Frais de tenue de compte, droits de garde | **Frais** | |
| « Remboursement plaf. PEA trop perçu », régularisations créditrices | **Remboursement de frais** | Crédit de liquidités sans lien avec un titre ; ne gonfle pas le montant investi |

## Notes techniques

- Next.js (App Router) + TypeScript, SQLite via Drizzle ORM + better-sqlite3,
  graphes Recharts, Tailwind CSS.
- Les calculs de portefeuille (PRU au coût moyen, série de valeur quotidienne
  avec forward-fill des cours, projection DCA) sont des fonctions pures dans
  `src/lib/`, testées avec Vitest : `npm test`.
- Le PRU est calculé frais inclus ; « montant investi » = versements nets
  (la référence du plafond PEA).
- Le modèle de données prévoit déjà plusieurs types de comptes
  (assurance-vie, PER, PEE, LDD…) pour les évolutions futures — l'UI v1 est
  centrée sur un compte unique.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de dev (applique le schéma DB avant) |
| `npm run db:push` | crée/synchronise le schéma SQLite |
| `npm run seed` | données de démo (`-- --with-fake-prices` pour un historique de cours hors-ligne) |
| `npm test` | tests unitaires (portefeuille, simulation, parsing Yahoo) |
| `npm run lint` | ESLint |
