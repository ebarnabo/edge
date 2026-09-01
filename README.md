# Edge

Analyse probabiliste des jeux FDJ et modèles de prédiction sportive. Next.js 15 (App Router),
React 19, Tailwind v4, primitives shadcn/Radix.

L'application traite deux domaines aux propriétés mathématiques opposées, et le code le reflète.

---

## Ce que fait chaque module

### Tirages — `/loto`

Les tirages FDJ sont indépendants et uniformes. **Aucun modèle ne peut prédire les boules**, et
l'application ne prétend pas le contraire. Ce qu'elle calcule est réel et vérifiable :

| Fonction | Méthode |
|---|---|
| Test d'uniformité | χ² d'ajustement + z-score binomial exact par numéro, p-value par Wilson–Hilferty |
| Probabilités par rang | Loi hypergéométrique sur les combinaisons exactes (Loto : 19 068 840) |
| Espérance de gain | Table des rangs × gains, partage du rang 1 par `E[1/(1+K)]`, `K ~ Poisson(λ)` |
| Jackpot d'équilibre | Seuil de jackpot rendant l'espérance nulle, partage compris |
| Systèmes réducteurs | Recouvrement glouton sur masques de bits : garantie « *g* bons sur une grille si *h* de mes numéros sortent » |
| Suivi de budget | Plafond mensuel, retour constaté vs taux annoncé, projection annuelle |

#### Éviter les combinaisons populaires

Le seul levier qui augmente réellement l'espérance de gain d'une grille. Choisir une combinaison
rare ne change **aucune** probabilité de gagner — elle change ce qu'on touche, parce que le rang 1
se partage entre tous les gagnants et que les grilles sont loin d'être jouées uniformément.

Le score de popularité combine les régularités documentées dans la littérature sur les loteries :
grilles d'anniversaire (tous les numéros sous 32), numéros de mois sur-représentés, progressions
arithmétiques, lignes et diagonales du bulletin papier, multiples d'un même nombre, sommes
centrales — et à l'inverse les suites consécutives et les numéros au-dessus de 31, que les joueurs
fuient. La normalisation passe par le score moyen d'une combinaison tirée uniformément, estimé sur
120 000 échantillons déterministes.

Effet mesuré, jackpot de 5 M€ et 9 millions de grilles jouées :

| Grille | Popularité | Autres gagnants | Rang 1 après partage |
|---|---|---|---|
| 1-2-3-4-5 (ligne du bulletin) | ×35,5 | 16,7 | 299 000 € |
| 5-10-15-20-25 (progression) | ×20,0 | 9,5 | 529 000 € |
| 3-7-12-19-24 (anniversaire) | ×6,4 | 3,0 | 1 573 000 € |
| 4-17-23-38-45 (quelconque) | ×0,63 | 0,30 | 4 327 000 € |
| 33-34-35-41-47 (hauts, consécutifs) | ×0,06 | 0,03 | 4 928 000 € |

Soit **0,82 € contre 1,00 € d'espérance** par grille — un TRJ qui passe de 37,3 % à 45,3 %. Le
générateur propose des grilles tirées dans le meilleur centile plutôt qu'au minimum strict : la
rareté sature vite (×0,06 et ×0,30 donnent 98,6 % et 97 % du rang 1) et la queue du modèle est sa
partie la moins fiable.

FDJ ne publie pas la répartition réelle des grilles jouées. Les coefficients sont des ordres de
grandeur exposés dans `src/lib/loto/popularity.ts`, à régler si tu disposes de meilleures données.

#### Recherche active de signal

Une seconde batterie ne se contente pas de constater l'uniformité : elle cherche une structure.

| Test | Ce qu'il cherche |
|---|---|
| χ² sur fenêtre glissante de 260 tirages | Dérive de la machine : boule usée, réglage modifié |
| Corrélation de rang 1 sur chaque numéro | Mémoire d'un tirage au suivant, χ² à `pool` degrés de liberté |
| Loi des écarts contre la géométrique | Le mythe du « numéro en retard » |
| Somme des numéros contre la loi exacte | Distribution obtenue par dénombrement complet, pas par approximation |

Puis un **backtest à l'aveugle** de six façons de choisir sa grille — chauds, froids, plus grand
retard, sortis récemment, hasard, grille fixe. À chaque tirage la grille est composée avec la
seule information disponible avant le tirage, puis confrontée au résultat réel. La moyenne
théorique de bons numéros vaut `pick² / pool`, soit 0,5102 au Loto, et l'erreur type se calcule
exactement par la variance hypergéométrique. Les six courbes se superposent dans la bande à deux
écarts-types.

Ce backtest est le cœur honnête du module : il ne dit pas « les tirages sont aléatoires », il le
mesure sur les données réelles et affiche l'écart en σ.

Le système réducteur est le seul levier de dépense réel : sur 12 numéros, la garantie 3 sur 5
descend de **792 grilles à 14** (−98 %). Il ne change pas l'espérance par euro misé — il abaisse
le ticket d'entrée pour une garantie donnée.

### Sport — `/sports`

Un match porte de l'information, contrairement à un tirage. **Les cotes n'entrent jamais dans la
prédiction** : elles ne servent qu'à mesurer l'écart au marché, une fois la marge retirée.

#### Variables lues à chaque match

Extraites en un seul passage chronologique, donc strictement causales — à chaque match, seules les
rencontres antérieures sont visibles. C'est ce qui rend le backtest honnête.

| Football | NBA |
|---|---|
| Écart Elo (K modulé par la marge de buts) | Écart Elo (multiplicateur de marge, correction du favori) |
| Forme récente pondérée, décroissance 0,82 par match | Forme sur 10 matchs |
| Puissance offensive et solidité défensive sur 10 matchs | Marge ajustée à la force du calendrier |
| Confrontations directes, 6 dernières, pondérées | Points marqués / encaissés sur 15 matchs |
| Jours de repos, matchs sur 14 jours | Jours de repos, back-to-back |
| Série en cours, forme à domicile / à l'extérieur | — |

#### Modèles empilés

1. **Dixon–Coles** (football) — génératif. `λ = exp(attaque_dom + défense_ext + terrain)`, ajusté par
   montée de gradient sur la vraisemblance pondérée d'une décroissance `exp(-ξ·jours)`. La
   correction τ redresse les scores serrés (0-0, 1-0, 0-1, 1-1). Donne buts attendus, +/−2,5, BTTS
   et scores exacts, qu'un modèle de classement ne peut pas produire.
2. **Elo seul** (NBA) — référence à battre.
3. **Régression logistique multinomiale** — discriminante. Softmax entraîné par Adam, variables
   standardisées, pénalité L2, observations pondérées par une demi-vie de 420 jours. Elle capte la
   forme, le repos et l'historique direct, que Dixon–Coles ignore par construction.
4. **Mélange** — moyenne géométrique pondérée, plus stable que l'arithmétique sur des
   probabilités, suivie d'une **mise à l'échelle par température**. Poids et température choisis
   par balayage du simplexe sur un jeu de calage, jamais sur les données finales.

#### Validation par origine glissante

C'est la partie qui compte. Les modèles sont réajustés tous les 40 matchs sur le passé strict,
puis notés sur les matchs suivants, jamais vus. Les prédictions hors échantillon sont ensuite
coupées : 60 % pour choisir le mélange, 40 % réservés et jamais touchés pour le rapport final.

Métriques : **log-perte**, **RPS** (référence de la littérature football, tient compte de l'ordre
domicile → nul → extérieur), **Brier**, exactitude, **erreur de calibration attendue**, et
l'**apport** face aux fréquences de base de la compétition. Un modèle sous zéro fait pire que de
répondre « 45 / 26 / 29 » à chaque match — l'application le dit alors sans détour.

Trois courbes accompagnent le rapport : RPS glissant par modèle contre la ligne de base, diagramme
de fiabilité prédit/observé, et poids des variables. Chaque prédiction affiche en plus l'accord
entre modèles et la contribution de chaque facteur, en points de logit.

#### Matchs à venir et balayage de value — `/sports/scan`

Le calendrier des quatorze prochains jours en football et des huit prochains en NBA passe dans
l'ensemble validé, puis se confronte au marché. Le classement pondère l'écart par l'apport mesuré
du modèle sur ce championnat : un écart de 3 % annoncé par un modèle qui ne bat la ligne de base
que de 1 % ne vaut pas le même écart annoncé par un modèle à 8 %.

#### Cotes multi-bookmakers

La marge n'est **pas** retirée sur une moyenne des cotes : chaque opérateur a sa propre marge,
souvent répartie de façon asymétrique entre favori et outsider. Elle est donc retirée par la
méthode de Shin chez **chacun**, puis les probabilités équitables obtenues sont agrégées par
médiane — plus robuste qu'une moyenne face à une cote périmée. Pinnacle, Betfair, Matchbook et
Smarkets sont reconnus comme lignes de référence et servent de comparaison prioritaire quand ils
sont présents.

L'écart se mesure contre le consensus ; la mise se chiffre au **meilleur prix disponible**. Sur un
marché à cinq opérateurs, prendre la meilleure cote plutôt que la médiane rapporte typiquement 2 à
3 % — soit l'ordre de grandeur de l'avantage recherché. Un modèle correct qui parie au mauvais
prix ne gagne rien.

Les fournisseurs n'écrivent pas les clubs de la même façon. Le rapprochement combine
normalisation (accents, sigles, années de fondation, descriptifs génériques), correspondance de
radical — « rennais » et « rennes » partagent quatre lettres — table d'alias pour les
abréviations que la similarité ne peut pas résoudre (« LA » et « Los Angeles »), et exigence
d'écart au second candidat pour ne pas confondre deux clubs d'une même ville.

---

## Installation

```bash
npm install
cp .env.example .env.local   # renseigner les clés API
npm run ingest:all           # télécharge et normalise les données dans /data
npm run dev
```

### Clés API

| Variable | Service | Palier gratuit |
|---|---|---|
| `FOOTBALL_DATA_TOKEN` | [football-data.org](https://www.football-data.org/client/register) | Top compétitions, 10 requêtes/min |
| `BALLDONTLIE_KEY` | [app.balldontlie.io](https://app.balldontlie.io) | NBA teams/players/games, 5 requêtes/min |
| `ODDS_API_KEY` | [the-odds-api.com](https://the-odds-api.com) | Cotes multi-bookmakers, quota mensuel limité |

Aucune clé n'est requise pour les tirages FDJ : les archives sont publiques.

### Import des données

```bash
npm run ingest:all                    # historiques : FDJ, football, NBA, calendrier
npm run ingest:daily                  # à relancer souvent : calendrier + cotes
npm run ingest:fdj -- loto            # un seul jeu
npm run ingest:football -- FL1 PL PD  # par code de compétition
npm run validate                      # rapport de validation en console
```

Le script FDJ télécharge les ZIP officiels de `sto.api.fdj.fr`, décompresse, décode le
Windows-1252, tolère les en-têtes variables selon l'époque et déduplique par date + combinaison.
L'historique Loto remonte à 1976, EuroMillions à 2004.

### Persistance des modèles

Reconstruire une chaîne coûte une dizaine de secondes : validation par origine glissante,
réajustements successifs, ajustement final. Elle est écrite dans `.cache/models/`, indexée sur
l'empreinte des données d'entrée — un nouvel import change l'empreinte et déclenche
automatiquement un réajustement. Mesuré : **9,7 s à froid, 5 ms depuis le cache**, prédictions
identiques au bit près. Incrémente `VERSION` dans `src/lib/sports/persistence.ts` dès qu'un modèle
change de forme.

### Hors ligne

L'application s'installe en PWA. Le service worker sépare deux régimes : les ressources de build
sont immuables et servies depuis le cache sans toucher au réseau ; les pages passent par le
réseau avec repli sur la dernière version connue. Les requêtes POST ne sont jamais mises en cache
— une prédiction se recalcule, elle ne se rejoue pas. Le suivi de budget fonctionne entièrement
hors ligne, les saisies restant dans le navigateur.

---

## Structure

```
src/lib/fdj/        configuration des jeux, URLs d'archives, parseur CSV
src/lib/loto/       probabilité, statistiques, diagnostics, popularité, réducteurs, budget
src/lib/sports/     Dixon-Coles, Elo, logistique, mélange, backtest, cotes, persistance
scripts/            ingestion (exécutés hors application)
data/               JSON normalisés, générés — non versionnés
.cache/models/      chaînes ajustées, invalidées à chaque import
```

---

## Points à calibrer

- **`LOTO_FIXED_PRIZES`** contient des ordres de grandeur pour les rangs 2 à 10. Ils varient à
  chaque tirage selon le nombre de gagnants. Remplace-les par les rapports officiels si tu veux
  une espérance au centime.
- **`ticketsSold`** est un curseur, pas une donnée : FDJ ne publie pas le nombre de grilles par
  tirage. L'ordre de grandeur usuel se situe entre 5 et 15 millions hors gros jackpots.
- **`xi`** (décroissance temporelle Dixon–Coles) vaut 0,0018/jour, soit une demi-vie d'environ un
  an. Monte-le pour donner plus de poids à la forme récente, baisse-le pour plus de stabilité.
- Le modèle football ignore les blessures, les compositions et les enjeux de fin de saison. Sur
  ces trois points, un lecteur attentif de l'actualité bat le modèle.

---

## Avertissement

Les jeux d'argent et de hasard comportent des risques : endettement, isolement, dépendance.
Le taux de retour du Loto est de 54,35 % : sur la durée, la mise moyenne ne revient pas, et aucun
outil de cette application ne modifie ce fait. Le module budget existe pour le rendre visible.

Aide gratuite et anonyme : [joueurs-info-service.fr](https://www.joueurs-info-service.fr) —
09 74 75 13 13.
