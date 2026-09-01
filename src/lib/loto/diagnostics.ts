import type { GameConfig } from "@/lib/fdj/games";
import type { Draw } from "@/lib/fdj/types";

/**
 * Batterie de tests qui cherche activement une structure dans les tirages :
 * dérive temporelle, mémoire d'un tirage sur l'autre, loi des écarts,
 * distribution des sommes. Puis un backtest de stratégies pour mesurer, en
 * conditions réelles, ce que rapporte chaque manière de choisir ses numéros.
 *
 * Ces tests sont écrits pour trouver un signal s'il existe. Sur des données
 * FDJ ils n'en trouvent pas — c'est le résultat, et il vaut mieux le voir
 * mesuré qu'affirmé.
 */

export interface TestResult {
  name: string;
  statistic: number;
  reference: string;
  pValue: number;
  passed: boolean;
  reading: string;
}

// ---------------------------------------------------------------- outils

function normalCdf(z: number): number {
  const sign = Math.sign(z);
  const a = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a);
  return 0.5 * (1 + sign * y);
}

function chiSquareUpperTail(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1;
  const t = Math.cbrt(x / df);
  const z = (t - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}

// -------------------------------------------------- dérive dans le temps

export interface RollingPoint {
  index: number;
  date: string;
  chiSquare: number;
  pValue: number;
}

/**
 * χ² calculé sur une fenêtre glissante. Un tirage biaisé — boule usée,
 * machine déréglée — produirait une dérive visible. Un tirage sain oscille
 * autour de son nombre de degrés de liberté.
 */
export function rollingUniformity(
  draws: Draw[],
  game: GameConfig,
  window = 260,
  stride = 20,
): RollingPoint[] {
  const { pool, pick } = game.main;
  const out: RollingPoint[] = [];
  const chronological = [...draws].reverse();

  for (let end = window; end <= chronological.length; end += stride) {
    const slice = chronological.slice(end - window, end);
    const counts = new Array(pool + 1).fill(0);
    for (const d of slice) for (const n of d.main) counts[n] += 1;

    const expected = (slice.length * pick) / pool;
    let chi = 0;
    for (let n = 1; n <= pool; n++) chi += (counts[n] - expected) ** 2 / expected;

    out.push({
      index: end,
      date: slice[slice.length - 1].date,
      chiSquare: chi,
      pValue: chiSquareUpperTail(chi, pool - 1),
    });
  }
  return out;
}

// ------------------------------------------------ mémoire d'un tirage à l'autre

/**
 * Corrélation de rang 1 : un numéro sorti au tirage t a-t-il plus ou moins
 * de chances de revenir au tirage t+1 ? La somme des z² suit un χ² à `pool`
 * degrés de liberté sous l'hypothèse d'indépendance.
 */
export function serialIndependence(draws: Draw[], game: GameConfig): TestResult {
  const { pool } = game.main;
  const chronological = [...draws].reverse();
  const n = chronological.length - 1;

  const present = chronological.map((d) => {
    const set = new Set(d.main);
    return Array.from({ length: pool }, (_, i) => (set.has(i + 1) ? 1 : 0));
  });

  let statistic = 0;
  for (let i = 0; i < pool; i++) {
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let t = 0; t < n; t++) {
      const x = present[t][i];
      const y = present[t + 1][i];
      sx += x;
      sy += y;
      sxy += x * y;
      sxx += x * x;
      syy += y * y;
    }
    const num = n * sxy - sx * sy;
    const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    const r = den > 0 ? num / den : 0;
    statistic += r * r * (n - 1);
  }

  const pValue = chiSquareUpperTail(statistic, pool);
  return {
    name: "Indépendance entre tirages consécutifs",
    statistic,
    reference: `χ² à ${pool} degrés de liberté`,
    pValue,
    passed: pValue > 0.05,
    reading:
      pValue > 0.05
        ? "Le tirage précédent ne porte aucune information sur le suivant."
        : "Une dépendance apparaît entre tirages consécutifs, à vérifier sur un autre échantillon.",
  };
}

// ------------------------------------------------------------ loi des écarts

/**
 * Sous indépendance, l'écart entre deux sorties d'un même numéro suit une loi
 * géométrique de paramètre p = pick/pool. C'est le test qui invalide
 * directement l'idée de « numéro en retard ».
 */
export function gapLaw(draws: Draw[], game: GameConfig): TestResult {
  const { pool, pick } = game.main;
  const p = pick / pool;
  const chronological = [...draws].reverse();

  const last = new Array(pool + 1).fill(-1);
  const gaps: number[] = [];
  chronological.forEach((d, t) => {
    for (const n of d.main) {
      if (last[n] >= 0) gaps.push(t - last[n]);
      last[n] = t;
    }
  });

  const maxBin = 40;
  const observed = new Array(maxBin + 1).fill(0);
  for (const g of gaps) observed[Math.min(maxBin, g)] += 1;

  let chi = 0;
  let bins = 0;
  for (let k = 1; k <= maxBin; k++) {
    const prob =
      k < maxBin ? (1 - p) ** (k - 1) * p : (1 - p) ** (maxBin - 1); // dernière classe : queue
    const expected = gaps.length * prob;
    if (expected < 5) continue;
    chi += (observed[k] - expected) ** 2 / expected;
    bins += 1;
  }

  const df = Math.max(1, bins - 1);
  const pValue = chiSquareUpperTail(chi, df);
  return {
    name: "Loi des écarts entre deux sorties",
    statistic: chi,
    reference: `χ² à ${df} degrés de liberté, loi géométrique p = ${p.toFixed(4)}`,
    pValue,
    passed: pValue > 0.05,
    reading:
      pValue > 0.05
        ? `Les écarts suivent la loi géométrique attendue. Un numéro absent depuis 40 tirages a la même probabilité qu'un autre : ${(p * 100).toFixed(2)} %.`
        : "La distribution des écarts s'écarte de la loi géométrique.",
  };
}

// ---------------------------------------------------- distribution des sommes

/** Nombre exact de combinaisons de `pick` numéros distincts de 1..pool de somme s. */
export function exactSumDistribution(pool: number, pick: number): number[] {
  const maxSum = ((pool + (pool - pick + 1)) * pick) / 2;
  const ways: number[][] = Array.from({ length: pick + 1 }, () => new Array(maxSum + 1).fill(0));
  ways[0][0] = 1;

  for (let v = 1; v <= pool; v++) {
    for (let k = pick; k >= 1; k--) {
      for (let s = maxSum; s >= v; s--) {
        ways[k][s] += ways[k - 1][s - v];
      }
    }
  }

  const total = ways[pick].reduce((a, b) => a + b, 0);
  return ways[pick].map((w) => w / total);
}

export interface SumComparison {
  test: TestResult;
  bins: { sum: number; observed: number; expected: number }[];
}

export function sumDistribution(draws: Draw[], game: GameConfig, binSize = 10): SumComparison {
  const { pool, pick } = game.main;
  const exact = exactSumDistribution(pool, pick);
  const maxSum = exact.length - 1;

  const observedCounts = new Map<number, number>();
  for (const d of draws) {
    const s = d.main.reduce((a, b) => a + b, 0);
    const bin = Math.floor(s / binSize) * binSize;
    observedCounts.set(bin, (observedCounts.get(bin) ?? 0) + 1);
  }

  const bins: SumComparison["bins"] = [];
  let chi = 0;
  let df = 0;

  for (let bin = 0; bin <= maxSum; bin += binSize) {
    let prob = 0;
    for (let s = bin; s < bin + binSize && s <= maxSum; s++) prob += exact[s];
    const expected = prob * draws.length;
    const observed = observedCounts.get(bin) ?? 0;
    if (expected < 5) continue;
    bins.push({ sum: bin + binSize / 2, observed, expected });
    chi += (observed - expected) ** 2 / expected;
    df += 1;
  }

  const pValue = chiSquareUpperTail(chi, Math.max(1, df - 1));
  return {
    bins,
    test: {
      name: "Distribution de la somme des numéros",
      statistic: chi,
      reference: `χ² à ${Math.max(1, df - 1)} degrés de liberté, loi exacte par dénombrement`,
      pValue,
      passed: pValue > 0.05,
      reading:
        pValue > 0.05
          ? "La courbe en cloche observée est exactement celle que produit un tirage uniforme. Filtrer les grilles sur leur somme ne change aucune probabilité de gain."
          : "La distribution des sommes s'écarte de la loi exacte.",
    },
  };
}

// ------------------------------------------------------- backtest de stratégies

export type StrategyId = "chauds" | "froids" | "retard" | "recents" | "aleatoire" | "fixe";

export interface StrategyResult {
  id: StrategyId;
  label: string;
  description: string;
  meanMatches: number;
  z: number;
  curve: number[];
}

export interface StrategyBacktest {
  strategies: StrategyResult[];
  theoretical: number;
  standardError: number;
  sampled: number;
  labels: string[];
}

const STRATEGY_META: Record<StrategyId, { label: string; description: string }> = {
  chauds: { label: "Numéros chauds", description: "Les plus sortis sur les 50 derniers tirages" },
  froids: { label: "Numéros froids", description: "Les moins sortis sur les 50 derniers tirages" },
  retard: { label: "Plus grand retard", description: "Les plus longtemps absents" },
  recents: { label: "Sortis récemment", description: "Les plus récemment tombés" },
  aleatoire: { label: "Tirage au hasard", description: "Grille tirée uniformément" },
  fixe: { label: "Grille fixe", description: "Toujours les mêmes numéros" },
};

/**
 * Simulation à l'aveugle : à chaque tirage, la grille est choisie avec la
 * seule information disponible avant ce tirage, puis confrontée au résultat.
 * La moyenne théorique de bons numéros vaut pick² / pool, quelle que soit
 * la méthode de sélection.
 */
export function strategyBacktest(
  draws: Draw[],
  game: GameConfig,
  lookback = 50,
): StrategyBacktest {
  const { pool, pick } = game.main;
  const chronological = [...draws].reverse();
  const ids = Object.keys(STRATEGY_META) as StrategyId[];

  const totals: Record<StrategyId, number> = {
    chauds: 0, froids: 0, retard: 0, recents: 0, aleatoire: 0, fixe: 0,
  };
  const curves: Record<StrategyId, number[]> = {
    chauds: [], froids: [], retard: [], recents: [], aleatoire: [], fixe: [],
  };

  let seed = 20260831;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const fixed = Array.from({ length: pick }, (_, i) => i + 1);

  let evaluated = 0;

  for (let t = lookback; t < chronological.length; t++) {
    const past = chronological.slice(t - lookback, t);
    const counts = new Array(pool + 1).fill(0);
    const gap = new Array(pool + 1).fill(lookback);

    past.forEach((d, i) => {
      for (const n of d.main) {
        counts[n] += 1;
        gap[n] = past.length - 1 - i;
      }
    });

    const ranked = (compare: (a: number, b: number) => number) =>
      Array.from({ length: pool }, (_, i) => i + 1)
        .sort(compare)
        .slice(0, pick);

    const random: number[] = [];
    while (random.length < pick) {
      const n = 1 + Math.floor(rnd() * pool);
      if (!random.includes(n)) random.push(n);
    }

    const picks: Record<StrategyId, number[]> = {
      chauds: ranked((a, b) => counts[b] - counts[a]),
      froids: ranked((a, b) => counts[a] - counts[b]),
      retard: ranked((a, b) => gap[b] - gap[a]),
      recents: ranked((a, b) => gap[a] - gap[b]),
      aleatoire: random,
      fixe: fixed,
    };

    const actual = new Set(chronological[t].main);
    evaluated += 1;

    for (const id of ids) {
      totals[id] += picks[id].filter((n) => actual.has(n)).length;
      curves[id].push(totals[id] / evaluated);
    }
  }

  const theoretical = (pick * pick) / pool;
  const variance =
    pick * (pick / pool) * (1 - pick / pool) * ((pool - pick) / (pool - 1));
  const standardError = Math.sqrt(variance / evaluated);

  // Sous-échantillonnage des courbes pour l'affichage.
  const target = 140;
  const stride = Math.max(1, Math.floor(evaluated / target));
  const labels: string[] = [];
  for (let i = 0; i < evaluated; i += stride) {
    labels.push(chronological[lookback + i].date.slice(0, 4));
  }

  return {
    theoretical,
    standardError,
    sampled: evaluated,
    labels,
    strategies: ids.map((id) => ({
      id,
      ...STRATEGY_META[id],
      meanMatches: totals[id] / evaluated,
      z: (totals[id] / evaluated - theoretical) / standardError,
      curve: curves[id].filter((_, i) => i % stride === 0),
    })),
  };
}
