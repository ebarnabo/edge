/**
 * Détection de value : on compare la probabilité du MODÈLE à la probabilité
 * réelle du marché, obtenue en retirant la marge du bookmaker.
 * Les cotes ne servent jamais à produire la prédiction, uniquement à la juger.
 */

export interface Selection {
  label: string;
  modelProb: number;
  odds: number;
}

export interface ValuedSelection extends Selection {
  /** Probabilité brute impliquée par la cote, marge comprise */
  impliedProb: number;
  /** Probabilité de marché après retrait de la marge */
  fairProb: number;
  /** Cote équitable correspondant à la probabilité du modèle */
  fairOdds: number;
  edge: number;
  /** Espérance par euro misé */
  ev: number;
  kelly: number;
  stake: number;
  verdict: "value" | "neutre" | "éviter";
}

export interface ValueOptions {
  bankroll: number;
  /** Fraction de Kelly appliquée. 0.25 est un réglage prudent standard. */
  kellyFraction?: number;
  /** Edge minimal pour retenir un pari */
  threshold?: number;
}

/** Marge du bookmaker (overround) sur un marché complet. */
export function overround(selections: Selection[]): number {
  return selections.reduce((a, s) => a + 1 / s.odds, 0) - 1;
}

/**
 * Retrait de marge par la méthode de Shin : plus juste que la méthode
 * proportionnelle, qui sous-estime systématiquement les outsiders.
 */
export function devig(selections: Selection[]): number[] {
  const implied = selections.map((s) => 1 / s.odds);
  const sum = implied.reduce((a, b) => a + b, 0);
  if (sum <= 1) return implied;

  let z = 0;
  for (let i = 0; i < 100; i++) {
    const probs = implied.map(
      (p) => (Math.sqrt(z ** 2 + 4 * (1 - z) * (p ** 2 / sum)) - z) / (2 * (1 - z)),
    );
    const total = probs.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) < 1e-10) break;
    z += (total - 1) * 0.5;
    z = Math.min(0.5, Math.max(0, z));
  }
  const probs = implied.map(
    (p) => (Math.sqrt(z ** 2 + 4 * (1 - z) * (p ** 2 / sum)) - z) / (2 * (1 - z)),
  );
  const norm = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / norm);
}

export function evaluate(
  selections: Selection[],
  { bankroll, kellyFraction = 0.25, threshold = 0.02 }: ValueOptions,
): ValuedSelection[] {
  const fair = devig(selections);

  return selections.map((s, i) => {
    const b = s.odds - 1;
    const ev = s.modelProb * s.odds - 1;
    const kelly = Math.max(0, (s.modelProb * b - (1 - s.modelProb)) / b);
    const edge = s.modelProb - fair[i];

    return {
      ...s,
      impliedProb: 1 / s.odds,
      fairProb: fair[i],
      fairOdds: 1 / s.modelProb,
      edge,
      ev,
      kelly,
      stake: Math.round(kelly * kellyFraction * bankroll * 100) / 100,
      verdict: edge >= threshold && ev > 0 ? "value" : edge <= -threshold ? "éviter" : "neutre",
    };
  });
}
