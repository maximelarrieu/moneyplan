# Design System Master File — MoneyPlan

> **LOGIQUE :** avant de construire une page, vérifier `design-system/moneyplan/pages/[page].md`.
> S'il existe, ses règles **priment** sur ce fichier. Sinon, suivre strictement ce qui suit.
>
> Généré avec le skill ui-ux-pro-max puis édité pour refléter les décisions réellement
> implémentées (`src/app/globals.css` fait foi pour les valeurs).

---

**Projet :** MoneyPlan — suivi de PEA / DCA
**Direction :** « Carnet d'investisseur » — papier, encre, hairlines, éditorial calme.
Ce qui est banni : le look fintech générique (bleu « confiance », cartes ombrées, gros CTA colorés).

---

## Règles globales

### Palette (deux modes sélectionnés, jamais inversés)

| Rôle | Clair | Sombre | Variable |
|------|-------|--------|----------|
| Fond de page (papier) | `#f6f3ec` | `#121110` | `--page` |
| Surface (cartes, tables) | `#fdfcf9` | `#1c1a16` | `--surface` |
| Encre (texte principal) | `#1c1b17` | `#f2eee5` | `--ink` |
| Encre secondaire | `#5b564b` | `#c6bfb0` | `--ink-2` |
| Estompé (étiquettes, axes) | `#8b8578` | `#8b8578` | `--muted` |
| Filet / hairline | `rgba(28,27,23,.13)` | `rgba(242,238,229,.14)` | `--border` |
| Accent (vert bouteille) | `#16713c` | `#4ca97a` | `--accent` |
| Gain | `#156233` | `#4ca97a` | `--pos` |
| Perte (brique, pas rouge vif) | `#b03a24` | `#e0704f` | `--neg` |

**Graphes** (`--chart-1..6` + `--chart-cash`) : palette catégorielle validée par
`validate_palette.js` (dataviz skill) sur chaque surface — contraste ≥ 3:1,
séparation daltonisme ΔE ≥ 12. Toute retouche couleur doit être revalidée.

### Typographie

- **Titres & chiffres-clés :** stack serif système — `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` (`--font-serif`). Zéro dépendance réseau au build.
- **Corps :** stack sans système (`--font-sans`).
- **Chiffres :** `tabular-nums` obligatoire sur toute colonne ou comparaison de montants.
- **Étiquettes de section :** petites capitales espacées (`text-[11px] uppercase tracking-[0.16em] text-muted`).
- **Option d'upgrade validée par ui-ux-pro-max** (mood « magazine, editorial, refined ») :
  **Libre Bodoni** (titres) + **Public Sans** (corps) via `next/font/google`.
  Non embarquée par défaut : le build doit rester possible hors ligne / derrière proxy.

### Échelle d'espacement (rythme 4/8)

`4 / 8 / 16 / 24 / 32 / 48 / 64 px` — hiérarchie verticale des sections : 16/24/32/48.

### Reliefs

- **Pas d'ombres.** La profondeur vient des filets (`--border`) et des surfaces.
  Seule exception : le dialog (`shadow-xl` sur fond scrimé 55 %).
- **Coins carrés** (`border-radius: 0`) sur boutons, inputs, cartes, tables — façon registre.

## Spécifications de composants (`src/components/ui/`)

### Boutons — discrets par principe

- Une **seule** action « primary » (encre pleine : `bg-ink text-page`) par écran.
- Tout le reste : `outline` (hairline) ou `ghost`. Destructif : texte `--neg`, jamais d'aplat rouge.
- Jamais d'aplat de couleur vive ; hover = teinte d'encre à 4–6 %, transitions 150 ms explicites (jamais `transition: all`).

### Cartes

`border border-edge bg-surface`, titre en petites capitales, padding 20 px. Pas de hover-lift.

### Tables

En-tête petites capitales, séparateurs `divide-edge`, cellules `tabular-nums`,
wrapper `overflow-x-auto`. Alignement droite pour les montants.

### Formulaires

Labels visibles au-dessus (`<Label htmlFor>`), `inputMode="decimal"` + virgule décimale
acceptée, `autocomplete="off"` (pas de champs auth), `spellcheck=false` sur tickers/ISIN.
Erreurs annoncées via région `aria-live`.

### Navigation

Bandeau haut : wordmark serif + onglets texte soulignés (`border-b-2 accent` sur l'actif,
`aria-current="page"`). Pas de sidebar.

### Graphes (Recharts)

Grille `--grid` horizontale seule, axes `--axis`/`--muted` 11 px, tooltips sur cadre
`--surface` + hairline, légende toujours présente, `isAnimationActive={!useReducedMotion()}`.
Marqueurs d'achat : `--chart-3` (ocre) cerclés de surface.

## Anti-patterns (interdits)

- ❌ Fond blanc pur / fond slate « fintech »
- ❌ Aplats bleus, dégradés décoratifs, glassmorphism
- ❌ Ombres portées sur cartes, hover qui décale la mise en page
- ❌ Emojis comme icônes (Lucide uniquement, `aria-hidden` si décoratif)
- ❌ Coins arrondis
- ❌ `transition: all`, animations > 400 ms, animation sans `prefers-reduced-motion`
- ❌ Rouge/vert seuls pour porter l'information (toujours signe +/− ou texte)
- ❌ Couleur brute en dur dans un composant (tokens uniquement)

## Checklist avant livraison

- [ ] Palette graphes revalidée si retouchée (`validate_palette.js`, deux surfaces)
- [ ] Un seul bouton « encre pleine » par écran
- [ ] Contraste texte 4,5:1 vérifié dans les deux modes
- [ ] Focus clavier visible partout (`:focus-visible` global)
- [ ] `prefers-reduced-motion` respecté (CSS + Recharts)
- [ ] `tabular-nums` sur les colonnes de montants
- [ ] États vides utiles (message + action)
- [ ] Responsive 375 / 768 / 1024 / 1440, tables en `overflow-x-auto`
- [ ] Audit web-design-guidelines (Vercel) passé sur les fichiers touchés
