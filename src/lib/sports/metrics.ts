/**
 * Métriques d'évaluation probabiliste. Le RPS est la référence de la
 * littérature sur la prévision de football : il tient compte de l'ordre
 * naturel des issues (domicile → nul → extérieur), contrairement au Brier.
 */

export interface Scored {
  probs: number[];
  actual: number;
}

export const logLoss = (rows: Scored[]) =>
  rows.reduce((a, r) => a - Math.log(Math.max(1e-12, r.probs[r.actual])), 0) / (rows.length || 1);

export const brier = (rows: Scored[]) =>
  rows.reduce(
    (a, r) => a + r.probs.reduce((s, p, k) => s + (p - (k === r.actual ? 1 : 0)) ** 2, 0),
    0,
  ) / (rows.length || 1);

/** Ranked Probability Score — plus bas vaut mieux, borné à 1. */
export const rps = (rows: Scored[]) =>
  rows.reduce((acc, r) => {
    const k = r.probs.length;
    let cumP = 0;
    let cumY = 0;
    let sum = 0;
    for (let i = 0; i < k - 1; i++) {
      cumP += r.probs[i];
      cumY += i === r.actual ? 1 : 0;
      sum += (cumP - cumY) ** 2;
    }
    return acc + sum / (k - 1);
  }, 0) / (rows.length || 1);

export const accuracy = (rows: Scored[]) =>
  rows.filter((r) => r.probs.indexOf(Math.max(...r.probs)) === r.actual).length /
  (rows.length || 1);

/** Fréquence observée par tranche de probabilité prédite : mesure la calibration. */
export function calibration(rows: Scored[], bins = 10) {
  const buckets = Array.from({ length: bins }, (_, i) => ({
    from: i / bins,
    to: (i + 1) / bins,
    predicted: 0,
    observed: 0,
    count: 0,
  }));

  for (const r of rows) {
    r.probs.forEach((p, k) => {
      const i = Math.min(bins - 1, Math.floor(p * bins));
      buckets[i].predicted += p;
      buckets[i].observed += k === r.actual ? 1 : 0;
      buckets[i].count += 1;
    });
  }

  return buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      from: b.from,
      to: b.to,
      predicted: b.predicted / b.count,
      observed: b.observed / b.count,
      count: b.count,
    }));
}

/** Écart de calibration attendu : moyenne pondérée |observé − prédit|. */
export function expectedCalibrationError(rows: Scored[], bins = 10) {
  const c = calibration(rows, bins);
  const total = c.reduce((a, b) => a + b.count, 0) || 1;
  return c.reduce((a, b) => a + (b.count / total) * Math.abs(b.observed - b.predicted), 0);
}

/** Fréquences de base du jeu de données, pour situer le modèle. */
export function baseline(actuals: number[], classes = 3): number[] {
  const counts = new Array(classes).fill(0);
  for (const a of actuals) counts[a] += 1;
  return counts.map((c) => (c + 1) / (actuals.length + classes));
}
