import { fit, forecast, type FittedModel, type Match, type MatchForecast } from "./dixon-coles";
import { buildRows, FeatureEngine, FEATURE_NAMES } from "./features";
import { train, predict, importance, type LogisticModel } from "./logistic";
import { blend } from "./ensemble";
import { backtest, type BacktestResult } from "./backtest";

export interface Pipeline {
  dc: FittedModel;
  logit: LogisticModel;
  engine: FeatureEngine;
  validation: BacktestResult;
  teams: string[];
  matches: number;
  lastDate: string;
}

/**
 * Chaîne complète : validation d'abord, ajustement final ensuite.
 * L'ordre compte — les poids du mélange viennent de prédictions hors
 * échantillon, jamais des données sur lesquelles les modèles finaux tournent.
 */
export function buildPipeline(matches: Match[]): Pipeline {
  const validation = backtest(matches);
  const { rows, engine } = buildRows(matches);

  const dc = fit(matches, { iterations: 900 });
  const logit = train(
    rows.map((r) => r.x),
    rows.map((r) => r.y),
    rows.map((r) => r.date),
    { epochs: 1200 },
  );

  const ordered = [...matches].sort((a, b) => a.date.localeCompare(b.date));

  return {
    dc,
    logit,
    engine,
    validation,
    teams: [...dc.ratings.keys()].sort((a, b) => a.localeCompare(b, "fr")),
    matches: matches.length,
    lastDate: ordered[ordered.length - 1].date,
  };
}

export interface EnsembleForecast {
  home: string;
  away: string;
  /** Probabilités mélangées et calibrées : la sortie de référence */
  probs: { homeWin: number; draw: number; awayWin: number };
  byModel: { name: string; probs: number[] }[];
  /** Détail génératif : buts attendus, scores exacts, marchés dérivés */
  goals: MatchForecast;
  /** Contribution de chaque variable, en points de logit vers la victoire à domicile */
  drivers: { name: string; value: number; contribution: number }[];
  confidence: number;
}

const DRIVER_LABELS: Record<string, string> = {
  eloDiff: "Écart de force (Elo)",
  formDiff: "Forme récente",
  attackDiff: "Puissance offensive",
  defenceDiff: "Solidité défensive",
  h2hDiff: "Confrontations directes",
  restDiff: "Jours de repos",
  congestionDiff: "Calendrier chargé",
  streakDiff: "Série en cours",
  venueFormDiff: "Forme à domicile / extérieur",
};

export function predictMatch(
  pipeline: Pipeline,
  home: string,
  away: string,
  date = new Date().toISOString().slice(0, 10),
): EnsembleForecast | null {
  const goals = forecast(pipeline.dc, home, away);
  if (!goals) return null;

  const x = pipeline.engine.extract(home, away, date);
  const pLogit = predict(pipeline.logit, x);
  const pDc = [goals.homeWin, goals.draw, goals.awayWin];

  const { weights, temperature } = pipeline.validation.blendConfig;
  const probs = blend([pDc, pLogit], weights, temperature);

  // Contribution : poids standardisé × écart de la variable à sa moyenne.
  const w = pipeline.logit.weights;
  const drivers = FEATURE_NAMES.map((name, j) => {
    const z = (x[j] - pipeline.logit.mean[j]) / pipeline.logit.sd[j];
    return {
      name: DRIVER_LABELS[name] ?? name,
      value: x[j],
      contribution: (w[0][j] - w[2][j]) * z,
    };
  }).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  // Entropie normalisée : 1 = issue tranchée, 0 = trois issues équiprobables.
  const entropy = -probs.reduce((a, p) => a + p * Math.log(Math.max(1e-12, p)), 0);
  const confidence = 1 - entropy / Math.log(3);

  return {
    home,
    away,
    probs: { homeWin: probs[0], draw: probs[1], awayWin: probs[2] },
    byModel: [
      { name: "Dixon–Coles", probs: pDc },
      { name: "Logistique", probs: pLogit },
      { name: "Mélange", probs },
    ],
    goals,
    drivers,
    confidence,
  };
}

/** Trajectoire Elo d'une équipe, échantillonnée pour l'affichage. */
export function eloTrend(pipeline: Pipeline, teams: string[], points = 60) {
  const series = teams.map((team) => {
    const all = pipeline.engine.elo.history.filter((h) => h.team === team);
    const stepSize = Math.max(1, Math.floor(all.length / points));
    return {
      team,
      values: all.filter((_, i) => i % stepSize === 0 || i === all.length - 1),
    };
  });

  const length = Math.max(0, ...series.map((s) => s.values.length));
  const dates = series[0]?.values.map((v) => v.date.slice(0, 7)) ?? [];

  return { series, length, dates };
}

export const ratingTable = (pipeline: Pipeline) =>
  pipeline.engine.elo
    .table()
    .map((row) => {
      const r = pipeline.dc.ratings.get(row.team);
      return {
        team: row.team,
        elo: row.elo,
        attack: r ? Math.exp(r.attack) : 1,
        defence: r ? Math.exp(r.defence) : 1,
      };
    });
