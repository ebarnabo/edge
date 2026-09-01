import { C } from "./probability";

export interface WheelRequest {
  /** Numéros retenus par le joueur */
  numbers: number[];
  /** Taille d'une grille (5 au Loto, 6 à EuroDreams) */
  pick: number;
  /** Hypothèse : combien de numéros gagnants se trouvent parmi la sélection */
  hits: number;
  /** Garantie : au moins `guarantee` bons numéros sur une même grille */
  guarantee: number;
}

export interface WheelResult {
  grids: number[][];
  fullSystemSize: number;
  reduction: number;
  covered: boolean;
  /** Sous-ensembles de `hits` numéros non couverts (0 si garantie tenue) */
  uncovered: number;
}

const popcount = (x: number): number => {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >> 24;
};

function combinationsMask(size: number, k: number): number[] {
  const out: number[] = [];
  const idx = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    let mask = 0;
    for (const i of idx) mask |= 1 << i;
    out.push(mask);
    let i = k - 1;
    while (i >= 0 && idx[i] === size - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

/**
 * Système réducteur par recouvrement glouton.
 *
 * Il ne change PAS l'espérance de gain par euro misé : il garantit seulement
 * un rang minimal pour un budget donné, au lieu de payer le système complet.
 */
export function buildWheel({ numbers, pick, hits, guarantee }: WheelRequest): WheelResult {
  const size = numbers.length;
  if (size > 24) throw new Error("Sélection limitée à 24 numéros");
  if (pick > size || guarantee > hits || hits > size) {
    throw new Error("Paramètres incohérents");
  }

  const candidates = combinationsMask(size, pick);
  const targets = combinationsMask(size, hits);

  const remaining = new Set(targets);
  const chosen: number[] = [];

  while (remaining.size > 0) {
    let best = 0;
    let bestScore = -1;
    for (const g of candidates) {
      let score = 0;
      for (const t of remaining) if (popcount(g & t) >= guarantee) score++;
      if (score > bestScore) {
        bestScore = score;
        best = g;
      }
    }
    if (bestScore <= 0) break;
    chosen.push(best);
    for (const t of [...remaining]) {
      if (popcount(best & t) >= guarantee) remaining.delete(t);
    }
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const grids = chosen.map((mask) =>
    sorted.filter((_, i) => (mask >> i) & 1),
  );

  return {
    grids,
    fullSystemSize: C(size, pick),
    reduction: 1 - grids.length / C(size, pick),
    covered: remaining.size === 0,
    uncovered: remaining.size,
  };
}
