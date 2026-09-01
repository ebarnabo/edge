import type { GameConfig } from "@/lib/fdj/games";

/** Coefficient binomial exact en flottant (assez précis jusqu'à C(70,20)). */
export function C(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

export interface Rank {
  /** numéros principaux trouvés */
  main: number;
  /** complémentaires trouvés */
  bonus: number;
  /** 1 chance sur `odds` */
  odds: number;
  probability: number;
  label: string;
}

/** Nombre total de combinaisons d'une grille simple. */
export function totalCombinations(g: GameConfig): number {
  const main = C(g.main.pool, g.main.pick);
  const bonus = g.bonus ? C(g.bonus.pool, g.bonus.pick) : 1;
  return main * bonus;
}

/** Loi hypergéométrique : probabilité de trouver exactement `hit` numéros sur `pick` parmi `pool`. */
export function hypergeometric(pool: number, pick: number, hit: number): number {
  return (C(pick, hit) * C(pool - pick, pick - hit)) / C(pool, pick);
}

/** Table complète des rangs, du plus improbable au plus accessible. */
export function rankTable(g: GameConfig): Rank[] {
  const ranks: Rank[] = [];
  const bonusPick = g.bonus?.pick ?? 0;

  for (let m = g.main.pick; m >= 0; m--) {
    for (let b = bonusPick; b >= 0; b--) {
      const pMain = hypergeometric(g.main.pool, g.main.pick, m);
      const pBonus = g.bonus ? hypergeometric(g.bonus.pool, g.bonus.pick, b) : 1;
      const p = pMain * pBonus;
      if (p <= 0) continue;
      ranks.push({
        main: m,
        bonus: b,
        probability: p,
        odds: 1 / p,
        label: formatRank(g, m, b),
      });
    }
  }
  return ranks.sort((a, b) => a.probability - b.probability);
}

function formatRank(g: GameConfig, m: number, b: number): string {
  const left = `${m} n°`;
  if (!g.bonus || b === 0) return left;
  return `${left} + ${b} ${g.bonus.label.toLowerCase()}`;
}

export interface EvInput {
  game: GameConfig;
  /** Jackpot annoncé, en euros */
  jackpot: number;
  /** Nombre de grilles jouées par l'ensemble des joueurs sur le tirage (pour le partage) */
  ticketsSold: number;
  /** Gains fixes estimés des rangs inférieurs, indexés `"main-bonus"` */
  fixedPrizes?: Record<string, number>;
}

export interface EvResult {
  expectedReturn: number;
  price: number;
  /** Perte moyenne par grille, en euros */
  edge: number;
  /** TRJ effectif calculé sur ce tirage */
  effectiveTrj: number;
  /** Jackpot minimal pour une espérance nulle, partage inclus */
  breakEvenJackpot: number;
  /** Facteur de partage espéré du rang 1 : E[1/(1+K)] */
  shareFactor: number;
}

/**
 * Espérance de gain d'une grille simple.
 * Le partage du rang 1 est modélisé par E[1/(1+K)] avec K ~ Poisson(λ),
 * λ = nombre espéré d'AUTRES gagnants sur la même combinaison.
 */
export function expectedValue({
  game,
  jackpot,
  ticketsSold,
  fixedPrizes = {},
}: EvInput): EvResult {
  const total = totalCombinations(game);
  const lambda = Math.max(0, ticketsSold - 1) / total;
  const shareFactor = lambda < 1e-9 ? 1 : (1 - Math.exp(-lambda)) / lambda;

  const ranks = rankTable(game);
  const top = ranks[0];

  let expectedReturn = top.probability * jackpot * shareFactor;
  for (const r of ranks.slice(1)) {
    const prize = fixedPrizes[`${r.main}-${r.bonus}`] ?? 0;
    expectedReturn += r.probability * prize;
  }

  const lowerTiers = expectedReturn - top.probability * jackpot * shareFactor;
  const breakEvenJackpot =
    (game.price - lowerTiers) / (top.probability * shareFactor);

  return {
    expectedReturn,
    price: game.price,
    edge: expectedReturn - game.price,
    effectiveTrj: expectedReturn / game.price,
    breakEvenJackpot,
    shareFactor,
  };
}

/** Gains fixes observés côté FDJ pour les rangs bas du Loto (ordre de grandeur). */
export const LOTO_FIXED_PRIZES: Record<string, number> = {
  "5-0": 100_000,
  "4-1": 1_000,
  "4-0": 400,
  "3-1": 50,
  "3-0": 20,
  "2-1": 10,
  "2-0": 4,
  "1-1": 2.2,
  "0-1": 2.2,
};
