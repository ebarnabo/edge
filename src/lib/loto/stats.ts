import type { GameConfig } from "@/lib/fdj/games";
import type { Draw } from "@/lib/fdj/types";

export interface NumberStat {
  n: number;
  /** nombre d'apparitions */
  count: number;
  /** apparitions attendues sous hypothèse d'uniformité */
  expected: number;
  /** écart-type binomial de l'écart observé */
  z: number;
  /** tirages écoulés depuis la dernière sortie */
  gap: number;
  /** écart moyen théorique entre deux sorties */
  expectedGap: number;
  /** part des tirages où le numéro est sorti */
  rate: number;
}

export interface UniformityTest {
  chiSquare: number;
  degreesOfFreedom: number;
  /** p-value approchée (Wilson–Hilferty) */
  pValue: number;
  uniform: boolean;
  sample: number;
}

export interface GameAnalysis {
  drawCount: number;
  main: NumberStat[];
  bonus: NumberStat[];
  mainTest: UniformityTest;
  bonusTest: UniformityTest | null;
  sums: { mean: number; sd: number; observed: number[] };
  parity: Record<string, number>;
  consecutivePairs: number;
}

/**
 * Sous hypothèse d'uniformité, chaque numéro sort à chaque tirage avec p = pick/pool.
 * Son compteur suit donc une binomiale B(n, p) : le z-score est exact, pas approché.
 */
function statsFor(draws: Draw[], key: "main" | "bonus", pool: number, pick: number): NumberStat[] {
  const n = draws.length;
  const p = pick / pool;
  const expected = n * p;
  const sd = Math.sqrt(n * p * (1 - p));

  const count = new Array<number>(pool + 1).fill(0);
  const gap = new Array<number>(pool + 1).fill(-1);

  draws.forEach((draw, i) => {
    for (const num of draw[key]) {
      if (num < 1 || num > pool) continue;
      count[num] += 1;
      if (gap[num] === -1) gap[num] = i; // draws[0] = tirage le plus récent
    }
  });

  return Array.from({ length: pool }, (_, i) => {
    const num = i + 1;
    return {
      n: num,
      count: count[num],
      expected,
      z: sd > 0 ? (count[num] - expected) / sd : 0,
      gap: gap[num] === -1 ? n : gap[num],
      expectedGap: (1 - p) / p,
      rate: n > 0 ? count[num] / n : 0,
    };
  });
}

/** χ² d'ajustement à la loi uniforme sur les fréquences de sortie. */
function uniformityTest(stats: NumberStat[], sample: number): UniformityTest {
  const chiSquare = stats.reduce(
    (acc, s) => acc + (s.count - s.expected) ** 2 / (s.expected || 1),
    0,
  );
  const df = stats.length - 1;
  const pValue = chiSquareUpperTail(chiSquare, df);
  return { chiSquare, degreesOfFreedom: df, pValue, uniform: pValue > 0.05, sample };
}

/** Approximation de Wilson–Hilferty : suffisamment précise pour df ≳ 10. */
function chiSquareUpperTail(x: number, df: number): number {
  if (x <= 0) return 1;
  const t = Math.cbrt(x / df);
  const z = (t - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
  const sign = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-a * a);
  return sign * y;
}

export function analyse(game: GameConfig, draws: Draw[]): GameAnalysis {
  const main = statsFor(draws, "main", game.main.pool, game.main.pick);
  const bonus = game.bonus
    ? statsFor(draws, "bonus", game.bonus.pool, game.bonus.pick)
    : [];

  const sums = draws.map((d) => d.main.reduce((a, b) => a + b, 0));
  const mean = sums.reduce((a, b) => a + b, 0) / (sums.length || 1);
  const sd = Math.sqrt(
    sums.reduce((acc, s) => acc + (s - mean) ** 2, 0) / (sums.length || 1),
  );

  const parity: Record<string, number> = {};
  let consecutivePairs = 0;
  for (const d of draws) {
    const even = d.main.filter((x) => x % 2 === 0).length;
    const key = `${d.main.length - even}/${even}`;
    parity[key] = (parity[key] ?? 0) + 1;
    for (let i = 1; i < d.main.length; i++) {
      if (d.main[i] === d.main[i - 1] + 1) consecutivePairs++;
    }
  }

  return {
    drawCount: draws.length,
    main,
    bonus,
    mainTest: uniformityTest(main, draws.length),
    bonusTest: bonus.length ? uniformityTest(bonus, draws.length) : null,
    sums: { mean, sd, observed: sums },
    parity,
    consecutivePairs,
  };
}
