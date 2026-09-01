import { softmax } from "./logistic";
import { logLoss, type Scored } from "./metrics";

/**
 * Mélange de modèles et calibration.
 *
 * Deux modèles regardent le même match par des chemins différents :
 * Dixon–Coles génère les buts, la logistique tranche directement l'issue.
 * Leurs erreurs ne sont pas identiques, donc leur moyenne géométrique
 * pondérée fait mieux que chacun pris seul — à condition de choisir le poids
 * sur des données que les modèles n'ont pas vues.
 */

export interface BlendConfig {
  weights: number[];
  temperature: number;
  logLoss: number;
}

/** Moyenne géométrique pondérée : plus stable que l'arithmétique sur des probabilités. */
export function blend(sources: number[][], weights: number[], temperature = 1): number[] {
  const k = sources[0].length;
  const logs = new Array(k).fill(0);

  sources.forEach((p, s) => {
    for (let i = 0; i < k; i++) logs[i] += weights[s] * Math.log(Math.max(1e-12, p[i]));
  });

  return softmax(logs.map((l) => l / temperature));
}

/**
 * Choisit les poids et la température qui minimisent la log-perte sur un jeu
 * de validation. Balayage du simplexe par pas de 0,05 : le nombre de modèles
 * reste petit, une recherche exhaustive est plus fiable qu'une descente.
 */
export function fitBlend(
  sources: number[][][], // [modèle][observation][classe]
  actuals: number[],
  step = 0.05,
): BlendConfig {
  const models = sources.length;
  const n = actuals.length;
  let best: BlendConfig = {
    weights: new Array(models).fill(1 / models),
    temperature: 1,
    logLoss: Infinity,
  };

  const grids: number[][] = [];
  const walk = (acc: number[], remaining: number, left: number) => {
    if (left === 1) {
      grids.push([...acc, Math.round(remaining * 100) / 100]);
      return;
    }
    for (let w = 0; w <= remaining + 1e-9; w += step) {
      walk([...acc, Math.round(w * 100) / 100], remaining - w, left - 1);
    }
  };
  walk([], 1, models);

  for (const weights of grids) {
    for (let t = 0.8; t <= 1.5; t += 0.05) {
      const rows: Scored[] = [];
      for (let i = 0; i < n; i++) {
        rows.push({
          probs: blend(sources.map((s) => s[i]), weights, t),
          actual: actuals[i],
        });
      }
      const ll = logLoss(rows);
      if (ll < best.logLoss) best = { weights, temperature: t, logLoss: ll };
    }
  }

  return best;
}
