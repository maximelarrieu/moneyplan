# MoneyPlan

Suivi de patrimoine multi-comptes (PEA, assurance-vie, PER, PEE, livrets…) :
positions, PRU, plus-values, dividendes, matelas de sécurité, graphes dans le
temps et simulation de scénarios d'investissement.

App web locale — vos données restent dans un fichier SQLite sur votre machine.

## Démarrage

```bash
npm install
npm run db:push        # crée data/moneyplan.db
npm run seed           # optionnel : données de démonstration (18 mois de DCA)
                       #   ajoutez --multi pour un livret + une assurance-vie
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

- **Patrimoine** (accueil) — valeur nette agrégée de tous les comptes, courbe
  dans le temps, répartition par enveloppe, jauge du matelas de sécurité, et
  tableau récapitulatif par compte.
- **Comptes** — créez et gérez plusieurs comptes (PEA, assurance-vie, PER, PEE,
  LDD, Livret A, compte-titres…). Chaque compte a son propre tableau de bord
  (valeur, plus-value, graphe, répartition, positions), accessible via le
  sélecteur de compte en haut.
- **Transactions** (par compte) — versements, achats, ventes, dividendes,
  retraits, frais, **intérêts** (livrets) et remboursements. À l'achat, une
  case (cochée par défaut) crée le versement correspondant. Les instruments se
  créent à la volée (ticker Yahoo, ex. `WPEA.PA`) ou en **valorisation
  manuelle** (fonds €, SCPI… sans cours de bourse).
- **Supports sans cours** — pour un fonds euros ou un livret : les livrets se
  suivent en solde (versements/retraits/intérêts) ; les fonds € se saisissent
  en montant investi, et leur valeur se met à jour à la main via « Mettre à
  jour la valorisation » sur la page du support.
- **Matelas de sécurité** — renseignez vos dépenses mensuelles et un objectif
  (en mois) dans **Profil** ; la jauge compare vos livrets (Livret A + LDD) à
  cet objectif.
- **Conseils** — recommandations calculées **localement** à partir de votre
  patrimoine agrégé et de votre profil : renforcer le matelas, orienter la
  capacité d'épargne (revenus − dépenses) vers le DCA, proximité du plafond PEA
  (150 k€), marge de déduction PER (≈ 10 % des revenus), sur-concentration d'une
  ligne (> 40 %). Une **synthèse IA optionnelle** (Claude) peut mettre ces
  conseils en récit — voir ci-dessous.
- **Détail d'une position** — cours historique avec ligne de PRU et marqueurs
  des achats, historique des opérations.
- **Simulation** — projetez votre patrimoine en comparant votre DCA actuel à
  un DCA augmenté (rendement et horizon paramétrables), avec jalons.

## Synthèse IA (optionnelle)

La page **Conseils** fonctionne entièrement en local. Pour activer la synthèse
rédigée par l'IA (Google Gemini), copiez le gabarit de configuration et
renseignez votre clé :

```bash
cp moneyplan.config.example.json moneyplan.config.json
# puis éditez moneyplan.config.json : "geminiApiKey": "AIza..."
```

Le fichier `moneyplan.config.json` est **git-ignoré** (votre clé n'est jamais
committée). Une clé Gemini gratuite s'obtient sur
[Google AI Studio](https://aistudio.google.com/apikey). Le modèle par défaut est
`gemini-2.5-flash` (modifiable via `geminiModel`).

Un bouton « Générer la synthèse » apparaît alors : il envoie vos chiffres
agrégés — **et uniquement au moment du clic** — à l'API Gemini pour rédiger une
synthèse des recommandations. Sans clé, la fonctionnalité reste masquée et rien
n'est transmis à l'extérieur.

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
| Intérêts d'un livret (Livret A, LDD…) | **Intérêts** | Crédités au cash, comptés en gain — hors montant investi |
| « Remboursement plaf. PEA trop perçu », régularisations créditrices | **Remboursement de frais** | Crédit de liquidités sans lien avec un titre ; ne gonfle pas le montant investi |

## Notes techniques

- Next.js (App Router) + TypeScript, SQLite via Drizzle ORM + better-sqlite3,
  graphes Recharts, Tailwind CSS.
- Les calculs de portefeuille (PRU au coût moyen, série de valeur quotidienne
  avec forward-fill des cours, projection DCA) sont des fonctions pures dans
  `src/lib/`, testées avec Vitest : `npm test`.
- Le PRU est calculé frais inclus ; « montant investi » = versements nets
  (la référence du plafond PEA).
- L'app est multi-comptes (PEA, assurance-vie, PER, PEE, LDD, Livret A,
  compte-titres…) : la math de portefeuille est générique par compte et
  agrégée pour la vue Patrimoine.
- Le conseiller (`src/lib/advisor.ts`) est un moteur de règles pur et testé ;
  la synthèse IA est un appel Claude optionnel, isolé dans une Server Action.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de dev (applique le schéma DB avant) |
| `npm run db:push` | crée/synchronise le schéma SQLite (pré-migration additive sans perte sur une base existante, puis `drizzle-kit push`) |
| `npm run seed` | données de démo (`-- --with-fake-prices` pour un historique de cours hors-ligne) |
| `npm test` | tests unitaires (portefeuille, simulation, parsing Yahoo) |
| `npm run lint` | ESLint |
