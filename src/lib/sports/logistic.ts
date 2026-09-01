/**
 * Régression logistique multinomiale (softmax) entraînée par Adam,
 * avec standardisation des variables, régularisation L2 et pondération
 * temporelle des observations.
 *
 * Modèle discriminant : il apprend directement la frontière entre 1, N et 2
 * à partir des variables de forme, d'Elo et de confrontations directes,
 * là où Dixon–Coles passe par la génération des buts.
 */

export interface TrainOptions {
  classes?: number;
  epochs?: number;
  learningRate?: number;
  l2?: number;
  /** Demi-vie de la pondération temporelle, en jours. 0 désactive. */
  halfLifeDays?: number;
}

export interface LogisticModel {
  weights: number[][]; // [classe][variable]
  bias: number[];
  mean: number[];
  sd: number[];
  classes: number;
  logLoss: number;
  samples: number;
}

function standardise(X: number[][]) {
  const d = X[0].length;
  const mean = new Array(d).fill(0);
  const sd = new Array(d).fill(0);

  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / X.length;
  for (const row of X) for (let j = 0; j < d; j++) sd[j] += (row[j] - mean[j]) ** 2 / X.length;
  for (let j = 0; j < d; j++) sd[j] = Math.sqrt(sd[j]) || 1;

  return { mean, sd };
}

export function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => e / sum);
}

export function train(
  X: number[][],
  y: number[],
  dates: string[] = [],
  opts: TrainOptions = {},
): LogisticModel {
  const {
    classes = 3,
    epochs = 900,
    learningRate = 0.05,
    l2 = 0.004,
    halfLifeDays = 420,
  } = opts;

  const n = X.length;
  const d = X[0].length;
  const { mean, sd } = standardise(X);
  const Z = X.map((row) => row.map((v, j) => (v - mean[j]) / sd[j]));

  let weights = Array.from({ length: classes }, () => new Array(d).fill(0));
  let bias = new Array(classes).fill(0);

  // Pondération temporelle : un match d'il y a trois ans pèse moins qu'hier.
  const latest = dates.length ? Math.max(...dates.map((s) => Date.parse(s))) : 0;
  const w = dates.length && halfLifeDays > 0
    ? dates.map((s) => 0.5 ** ((latest - Date.parse(s)) / 86_400_000 / halfLifeDays))
    : new Array(n).fill(1);
  const wSum = w.reduce((a, b) => a + b, 0);

  // Adam
  const mW = weights.map((r) => r.slice());
  const vW = weights.map((r) => r.slice());
  const mB = new Array(classes).fill(0);
  const vB = new Array(classes).fill(0);
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const gW = Array.from({ length: classes }, () => new Array(d).fill(0));
    const gB = new Array(classes).fill(0);

    for (let i = 0; i < n; i++) {
      const scores = weights.map((wc, k) => bias[k] + dot(wc, Z[i]));
      const p = softmax(scores);
      for (let k = 0; k < classes; k++) {
        const err = ((y[i] === k ? 1 : 0) - p[k]) * (w[i] / wSum);
        gB[k] += err;
        for (let j = 0; j < d; j++) gW[k][j] += err * Z[i][j];
      }
    }

    for (let k = 0; k < classes; k++) {
      for (let j = 0; j < d; j++) {
        const g = gW[k][j] - l2 * weights[k][j];
        mW[k][j] = b1 * mW[k][j] + (1 - b1) * g;
        vW[k][j] = b2 * vW[k][j] + (1 - b2) * g * g;
        const mHat = mW[k][j] / (1 - b1 ** epoch);
        const vHat = vW[k][j] / (1 - b2 ** epoch);
        weights[k][j] += (learningRate * mHat) / (Math.sqrt(vHat) + eps);
      }
      mB[k] = b1 * mB[k] + (1 - b1) * gB[k];
      vB[k] = b2 * vB[k] + (1 - b2) * gB[k] * gB[k];
      bias[k] +=
        (learningRate * (mB[k] / (1 - b1 ** epoch))) /
        (Math.sqrt(vB[k] / (1 - b2 ** epoch)) + eps);
    }
  }

  // Ancrage : la somme des scores par classe est libre, on la recentre.
  const meanBias = bias.reduce((a, b) => a + b, 0) / classes;
  bias = bias.map((b) => b - meanBias);
  weights = weights.map((row) => row.slice());

  const model: LogisticModel = {
    weights,
    bias,
    mean,
    sd,
    classes,
    logLoss: 0,
    samples: n,
  };

  let ll = 0;
  for (let i = 0; i < n; i++) {
    const p = predict(model, X[i]);
    ll -= Math.log(Math.max(1e-12, p[y[i]]));
  }
  model.logLoss = ll / n;

  return model;
}

export function predict(model: LogisticModel, x: number[]): number[] {
  const z = x.map((v, j) => (v - model.mean[j]) / model.sd[j]);
  return softmax(model.weights.map((wc, k) => model.bias[k] + dot(wc, z)));
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Importance relative des variables : |poids| moyen sur les classes. */
/**
 * Importance relative des variables : poids absolu moyen sur les classes.
 * `direction` compare la première classe à la dernière — victoire à domicile
 * contre victoire à l'extérieur — quel que soit le nombre de classes.
 */
export function importance(model: LogisticModel, names: readonly string[]) {
  const last = model.classes - 1;
  return names
    .map((name, j) => ({
      name,
      weight: model.weights.reduce((a, wc) => a + Math.abs(wc[j]), 0) / model.classes,
      direction: model.weights[0][j] - model.weights[last][j],
    }))
    .sort((a, b) => b.weight - a.weight);
}
