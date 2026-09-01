import type { GameConfig } from "@/lib/fdj/games";
import { C, totalCombinations } from "./probability";

/**
 * Modèle de popularité des combinaisons.
 *
 * Jouer une combinaison rare ne change AUCUNE probabilité de gagner. Cela
 * change combien on touche si l'on gagne : le rang 1 est partagé entre tous
 * les gagnants, et les grilles ne sont pas jouées uniformément. C'est le seul
 * levier qui augmente réellement l'espérance de gain d'une grille.
 *
 * Les coefficients ci-dessous reprennent les régularités documentées dans la
 * littérature sur les loteries (effet des dates, aversion aux suites, motifs
 * de bulletin). FDJ ne publie pas la répartition réelle des grilles jouées :
 * ce sont des ordres de grandeur, ajustables, pas des mesures.
 */

export interface PopularityWeights {
  /** Numéros 1-12 : jour ET mois, doublement sur-joués */
  month: number;
  /** Numéros 13-31 : jour du mois */
  day: number;
  /** Numéro 7, porte-bonheur récurrent */
  lucky: number;
  /** Toute la grille sous 32 : combinaison d'anniversaire */
  allDates: number;
  /** Au moins trois numéros consécutifs : les joueurs les fuient */
  consecutiveRun: number;
  /** Progression arithmétique complète (5, 10, 15, 20, 25) */
  arithmetic: number;
  /** Ligne, colonne ou diagonale du bulletin papier */
  slipPattern: number;
  /** Somme dans la zone centrale, où se concentrent les grilles */
  centralSum: number;
  /** Multiples d'un même nombre */
  multiples: number;
}

export const DEFAULT_WEIGHTS: PopularityWeights = {
  month: 1.9,
  day: 1.45,
  lucky: 1.25,
  allDates: 2.6,
  consecutiveRun: 0.45,
  arithmetic: 3.2,
  slipPattern: 2.8,
  centralSum: 1.15,
  multiples: 1.6,
};

export interface PopularityFactor {
  label: string;
  multiplier: number;
  /** Vrai si le facteur rend la grille plus jouée par les autres */
  crowding: boolean;
  detail: string;
}

export interface PopularityScore {
  /** Combien de fois plus jouée qu'une grille moyenne */
  ratio: number;
  factors: PopularityFactor[];
  /** Gagnants supplémentaires espérés au rang 1, à jackpot et volume donnés */
  expectedCoWinners: number;
  /** Part espérée du rang 1 : E[1/(1+K)] */
  shareFactor: number;
  /** Gain espéré au rang 1 après partage */
  expectedTopPrize: number;
}

const GRID_COLUMNS = 7; // disposition du bulletin Loto : 7 colonnes

function numberWeight(n: number, w: PopularityWeights): number {
  let weight = 1;
  if (n <= 12) weight *= w.month;
  else if (n <= 31) weight *= w.day;
  if (n === 7) weight *= w.lucky;
  return weight;
}

function longestRun(sorted: number[]): number {
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

function isArithmetic(sorted: number[]): boolean {
  if (sorted.length < 3) return false;
  const d = sorted[1] - sorted[0];
  return sorted.every((v, i) => i === 0 || v - sorted[i - 1] === d);
}

function slipAlignment(sorted: number[], pool: number): boolean {
  const cells = sorted.map((n) => ({ row: Math.floor((n - 1) / GRID_COLUMNS), col: (n - 1) % GRID_COLUMNS }));
  const sameRow = cells.every((c) => c.row === cells[0].row);
  const sameCol = cells.every((c) => c.col === cells[0].col);

  const sortedCells = [...cells].sort((a, b) => a.row - b.row);
  const diagonal =
    sortedCells.every((c, i) =>
      i === 0 ? true : c.row === sortedCells[i - 1].row + 1 && c.col === sortedCells[i - 1].col + 1,
    ) ||
    sortedCells.every((c, i) =>
      i === 0 ? true : c.row === sortedCells[i - 1].row + 1 && c.col === sortedCells[i - 1].col - 1,
    );

  return pool >= 40 && (sameRow || sameCol || diagonal);
}

function commonMultiples(sorted: number[]): number | null {
  for (const base of [3, 5, 7, 10]) {
    if (sorted.every((n) => n % base === 0)) return base;
  }
  return null;
}

/** Score brut, non normalisé. Sert aussi bien au calcul exact qu'à l'échantillonnage. */
function rawScore(combo: number[], game: GameConfig, w: PopularityWeights): number {
  const sorted = [...combo].sort((a, b) => a - b);
  let score = sorted.reduce((acc, n) => acc * numberWeight(n, w), 1);

  if (sorted.every((n) => n <= 31)) score *= w.allDates;
  if (longestRun(sorted) >= 3) score *= w.consecutiveRun;
  if (isArithmetic(sorted)) score *= w.arithmetic;
  if (slipAlignment(sorted, game.main.pool)) score *= w.slipPattern;
  if (commonMultiples(sorted)) score *= w.multiples;

  const sum = sorted.reduce((a, b) => a + b, 0);
  const centre = ((game.main.pool + 1) / 2) * game.main.pick;
  const spread = game.main.pool * 0.25;
  if (Math.abs(sum - centre) < spread) score *= w.centralSum;

  return score;
}

/**
 * Constante de normalisation : score moyen d'une combinaison tirée
 * uniformément. Estimée par échantillonnage déterministe — les multiplicateurs
 * de motif brisent la forme produit, ce qui interdit un calcul exact simple.
 */
function meanScore(game: GameConfig, w: PopularityWeights, samples = 120_000): number {
  const { pool, pick } = game.main;
  let seed = 20260901;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  let total = 0;
  const combo = new Array<number>(pick);
  for (let s = 0; s < samples; s++) {
    const used = new Set<number>();
    for (let i = 0; i < pick; i++) {
      let n: number;
      do n = 1 + Math.floor(rnd() * pool);
      while (used.has(n));
      used.add(n);
      combo[i] = n;
    }
    total += rawScore(combo, game, w);
  }
  return total / samples;
}

const meanCache = new Map<string, number>();

function normaliser(game: GameConfig, w: PopularityWeights): number {
  const key = `${game.id}:${JSON.stringify(w)}`;
  let m = meanCache.get(key);
  if (m === undefined) {
    m = meanScore(game, w);
    meanCache.set(key, m);
  }
  return m;
}

export interface ScoreInput {
  combo: number[];
  game: GameConfig;
  /** Grilles jouées sur le tirage, tous joueurs confondus */
  ticketsSold: number;
  jackpot: number;
  weights?: PopularityWeights;
}

export function scoreCombination({
  combo,
  game,
  ticketsSold,
  jackpot,
  weights = DEFAULT_WEIGHTS,
}: ScoreInput): PopularityScore {
  const sorted = [...combo].sort((a, b) => a - b);
  const ratio = rawScore(sorted, game, weights) / normaliser(game, weights);

  const factors: PopularityFactor[] = [];
  const dates = sorted.filter((n) => n <= 31).length;
  const months = sorted.filter((n) => n <= 12).length;

  if (sorted.every((n) => n <= 31)) {
    factors.push({
      label: "Grille d'anniversaire",
      multiplier: weights.allDates,
      crowding: true,
      detail: `Les ${sorted.length} numéros tiennent sous 32. C'est le motif le plus joué de toutes les loteries.`,
    });
  } else if (dates >= sorted.length - 1) {
    factors.push({
      label: "Presque tous des jours",
      multiplier: 1.4,
      crowding: true,
      detail: `${dates} numéros sur ${sorted.length} sont inférieurs à 32.`,
    });
  }

  if (months >= 3) {
    factors.push({
      label: "Numéros de mois",
      multiplier: weights.month,
      crowding: true,
      detail: `${months} numéros entre 1 et 12, la zone la plus dense en grilles jouées.`,
    });
  }

  if (isArithmetic(sorted)) {
    factors.push({
      label: "Progression régulière",
      multiplier: weights.arithmetic,
      crowding: true,
      detail: `Écart constant de ${sorted[1] - sorted[0]} entre chaque numéro.`,
    });
  }

  if (slipAlignment(sorted, game.main.pool)) {
    factors.push({
      label: "Motif sur le bulletin",
      multiplier: weights.slipPattern,
      crowding: true,
      detail: "Ligne, colonne ou diagonale de la grille papier — coché à la chaîne.",
    });
  }

  const base = commonMultiples(sorted);
  if (base) {
    factors.push({
      label: `Multiples de ${base}`,
      multiplier: weights.multiples,
      crowding: true,
      detail: "Sélection systématique, fréquente chez les joueurs réguliers.",
    });
  }

  const run = longestRun(sorted);
  if (run >= 3) {
    factors.push({
      label: `${run} numéros consécutifs`,
      multiplier: weights.consecutiveRun,
      crowding: false,
      detail: "Les joueurs évitent les suites, en les croyant improbables. Elles le sont autant que les autres.",
    });
  }

  const high = sorted.filter((n) => n > 31).length;
  if (high >= 3) {
    factors.push({
      label: `${high} numéros au-dessus de 31`,
      multiplier: 0.6,
      crowding: false,
      detail: "Hors de la plage des dates : ces numéros sont nettement sous-joués.",
    });
  }

  const total = totalCombinations(game);
  const expectedCoWinners = (Math.max(0, ticketsSold - 1) * ratio) / total;
  const shareFactor =
    expectedCoWinners < 1e-9 ? 1 : (1 - Math.exp(-expectedCoWinners)) / expectedCoWinners;

  return {
    ratio,
    factors,
    expectedCoWinners,
    shareFactor,
    expectedTopPrize: jackpot * shareFactor,
  };
}

export interface GeneratedGrid {
  combo: number[];
  ratio: number;
  shareFactor: number;
}

export interface GenerateInput {
  game: GameConfig;
  count: number;
  ticketsSold: number;
  jackpot: number;
  /** Numéros imposés par le joueur */
  include?: number[];
  /** Numéros bannis */
  exclude?: number[];
  /** Deux grilles ne partagent pas plus de N numéros */
  maxOverlap?: number;
  /** Fraction des meilleurs candidats dans laquelle piocher. 0,03 = meilleur centile élargi */
  variety?: number;
  weights?: PopularityWeights;
}

/**
 * Cherche des grilles sous-jouées par échantillonnage. Un recuit complet
 * serait inutile : l'espace des bonnes solutions est vaste, quelques milliers
 * de tirages suffisent à en trouver dans le premier centile.
 */
export function generateGrids({
  game,
  count,
  ticketsSold,
  jackpot,
  include = [],
  exclude = [],
  maxOverlap = 2,
  variety = 0.03,
  weights = DEFAULT_WEIGHTS,
}: GenerateInput): GeneratedGrid[] {
  const { pool, pick } = game.main;
  if (include.length > pick) throw new Error(`Au plus ${pick} numéros imposés.`);

  const banned = new Set(exclude);
  const pickable = Array.from({ length: pool }, (_, i) => i + 1).filter(
    (n) => !banned.has(n) && !include.includes(n),
  );
  if (pickable.length < pick - include.length) {
    throw new Error("Trop de numéros exclus pour composer une grille.");
  }

  let seed = Date.now() % 2147483647;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  const candidates: GeneratedGrid[] = [];
  const attempts = Math.min(40_000, 3000 * count);

  for (let i = 0; i < attempts; i++) {
    const combo = [...include];
    const pot = [...pickable];
    while (combo.length < pick) {
      combo.push(...pot.splice(Math.floor(rnd() * pot.length), 1));
    }
    combo.sort((a, b) => a - b);
    const s = scoreCombination({ combo, game, ticketsSold, jackpot, weights });
    candidates.push({ combo, ratio: s.ratio, shareFactor: s.shareFactor });
  }

  candidates.sort((a, b) => a.ratio - b.ratio);

  // Au-delà d'un certain point la rareté sature : passer de ×0,06 à ×0,30
  // ne fait bouger la part du rang 1 que de 98,6 % à 97 %. On tire donc au
  // hasard dans le meilleur centile plutôt que de prendre le minimum strict,
  // ce qui donne des grilles variées sans rien perdre d'utile — et évite de
  // faire confiance à la queue du modèle, qui est la partie la moins fiable.
  const elite = candidates.slice(0, Math.max(count * 4, Math.ceil(candidates.length * variety)));
  for (let i = elite.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [elite[i], elite[j]] = [elite[j], elite[i]];
  }

  const chosen: GeneratedGrid[] = [];
  for (const c of elite) {
    if (chosen.length >= count) break;
    const overlaps = chosen.some(
      (g) => g.combo.filter((n) => c.combo.includes(n)).length > maxOverlap,
    );
    if (!overlaps) chosen.push(c);
  }

  // Si la contrainte de recouvrement est trop stricte, on complète au mieux.
  for (const c of elite) {
    if (chosen.length >= count) break;
    if (!chosen.some((g) => g.combo.join() === c.combo.join())) chosen.push(c);
  }

  return chosen.slice(0, count).sort((a, b) => a.ratio - b.ratio);
}

/** Nombre de combinaisons possibles, pour situer la rareté. */
export const comboSpace = (game: GameConfig) => C(game.main.pool, game.main.pick);
