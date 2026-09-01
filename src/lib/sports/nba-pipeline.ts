import type { Game } from "./elo-nba";
import { train, predict, importance, type LogisticModel } from "./logistic";
import { blend, fitBlend, type BlendConfig } from "./ensemble";
import {
  accuracy,
  baseline,
  brier,
  calibration,
  expectedCalibrationError,
  logLoss,
  type Scored,
} from "./metrics";

/**
 * NBA : Elo pondéré par la marge, marge ajustée à la force du calendrier,
 * repos et forme récente, puis régression logistique binaire sur ces
 * variables. Le tout validé par origine glissante, comme le football.
 */

export const NBA_FEATURES = [
  "eloDiff",
  "sosMarginDiff",
  "formDiff",
  "restDiff",
  "b2bDiff",
  "offenceDiff",
  "defenceDiff",
] as const;

const LABELS: Record<string, string> = {
  eloDiff: "Écart de force (Elo)",
  sosMarginDiff: "Marge ajustée au calendrier",
  formDiff: "Forme sur 10 matchs",
  restDiff: "Jours de repos",
  b2bDiff: "Back-to-back",
  offenceDiff: "Points marqués",
  defenceDiff: "Points encaissés",
};

interface Entry {
  date: string;
  won: number;
  margin: number;
  adjMargin: number;
  scored: number;
  conceded: number;
}

const START = 1500;
const HOME_EDGE = 65;
const ELO_PER_POINT = 28;

export class NbaEngine {
  private elo = new Map<string, number>();
  private logs = new Map<string, Entry[]>();
  readonly eloHistory: { date: string; team: string; elo: number }[] = [];

  rating(team: string) {
    return this.elo.get(team) ?? START;
  }
  played(team: string) {
    return this.logs.get(team)?.length ?? 0;
  }
  private log(team: string) {
    let l = this.logs.get(team);
    if (!l) {
      l = [];
      this.logs.set(team, l);
    }
    return l;
  }

  extract(home: string, away: string, date: string): number[] {
    const h = this.log(home);
    const a = this.log(away);
    const mean = (arr: number[]) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0);

    const rest = (log: Entry[]) =>
      log.length ? Math.min(5, (Date.parse(date) - Date.parse(log[0].date)) / 86_400_000) : 3;
    const b2b = (log: Entry[]) => (rest(log) <= 1 ? 1 : 0);

    return [
      (this.rating(home) + HOME_EDGE - this.rating(away)) / 100,
      mean(h.slice(0, 20).map((e) => e.adjMargin)) - mean(a.slice(0, 20).map((e) => e.adjMargin)),
      mean(h.slice(0, 10).map((e) => e.won)) - mean(a.slice(0, 10).map((e) => e.won)),
      (rest(h) - rest(a)) / 3,
      b2b(a) - b2b(h),
      (mean(h.slice(0, 15).map((e) => e.scored)) - mean(a.slice(0, 15).map((e) => e.scored))) / 10,
      (mean(a.slice(0, 15).map((e) => e.conceded)) - mean(h.slice(0, 15).map((e) => e.conceded))) / 10,
    ];
  }

  push(g: Game) {
    const eloH = this.rating(g.home);
    const eloA = this.rating(g.away);
    const diff = eloH + HOME_EDGE - eloA;
    const expected = 1 / (1 + 10 ** (-diff / 400));
    const actual = g.homeScore > g.awayScore ? 1 : 0;

    const margin = g.homeScore - g.awayScore;
    const winnerDiff = actual === 1 ? diff : -diff;
    const mov = (Math.abs(margin) + 3) ** 0.8 / (7.5 + 0.006 * winnerDiff);
    const delta = 20 * mov * (actual - expected);

    this.elo.set(g.home, eloH + delta);
    this.elo.set(g.away, eloA - delta);
    this.eloHistory.push({ date: g.date, team: g.home, elo: eloH + delta });
    this.eloHistory.push({ date: g.date, team: g.away, elo: eloA - delta });

    // Marge corrigée de la force de l'adversaire, exprimée en points.
    const sos = (eloA - START) / ELO_PER_POINT;
    this.log(g.home).unshift({
      date: g.date,
      won: actual,
      margin,
      adjMargin: (margin + sos) / 10,
      scored: g.homeScore,
      conceded: g.awayScore,
    });
    this.log(g.away).unshift({
      date: g.date,
      won: 1 - actual,
      margin: -margin,
      adjMargin: (-margin + (eloH - START) / ELO_PER_POINT) / 10,
      scored: g.awayScore,
      conceded: g.homeScore,
    });
  }

  eloProbability(home: string, away: string, rest = 0): number {
    const diff = this.rating(home) + HOME_EDGE - this.rating(away) + rest;
    return 1 / (1 + 10 ** (-diff / 400));
  }

  /**
   * Total attendu : l'attaque de chacun confrontée à la défense de l'autre.
   * Les deux estimations sont moyennées, ce qui revient à corriger le rythme
   * de chaque équipe par celui de son adversaire.
   */
  totalEstimate(home: string, away: string, window = 15): number {
    const mean = (arr: number[], fallback: number) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback;

    const h = this.log(home).slice(0, window);
    const a = this.log(away).slice(0, window);

    const homePoints =
      (mean(h.map((e) => e.scored), 112) + mean(a.map((e) => e.conceded), 112)) / 2;
    const awayPoints =
      (mean(a.map((e) => e.scored), 112) + mean(h.map((e) => e.conceded), 112)) / 2;

    return homePoints + awayPoints;
  }

  table() {
    return [...this.elo.entries()]
      .map(([team, elo]) => ({ team, elo }))
      .sort((a, b) => b.elo - a.elo);
  }

  toJSON() {
    return { elo: [...this.elo], logs: [...this.logs], eloHistory: this.eloHistory };
  }

  static fromJSON(raw: ReturnType<NbaEngine["toJSON"]>): NbaEngine {
    const engine = new NbaEngine();
    for (const [team, elo] of raw.elo) engine.elo.set(team, elo);
    for (const [team, log] of raw.logs) engine.logs.set(team, log);
    engine.eloHistory.push(...raw.eloHistory);
    return engine;
  }
}

export interface NbaPipeline {
  engine: NbaEngine;
  logit: LogisticModel;
  blendConfig: BlendConfig;
  teams: string[];
  reports: { name: string; logLoss: number; brier: number; accuracy: number; calibrationError: number; skill: number }[];
  trend: { date: string; index: number; models: number[]; baseline: number }[];
  calibration: { from: number; to: number; predicted: number; observed: number; count: number }[];
  featureImportance: { name: string; weight: number; direction: number }[];
  holdout: number;
  games: number;
}

export function buildNbaPipeline(games: Game[], opts: { warmup?: number; step?: number } = {}): NbaPipeline {
  const { warmup = 400, step = 120 } = opts;
  const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date));

  const engine = new NbaEngine();
  const X: number[][] = [];
  const Y: number[] = [];
  const dates: string[] = [];
  const oos: { date: string; actual: number; byModel: number[][] }[] = [];

  let logit: LogisticModel | null = null;
  let since = Infinity;

  for (const g of ordered) {
    const ready = X.length >= warmup && engine.played(g.home) >= 10 && engine.played(g.away) >= 10;

    if (ready && since >= step) {
      logit = train(X, Y, dates, { classes: 2, epochs: 400 });
      since = 0;
    }

    if (ready && logit) {
      const x = engine.extract(g.home, g.away, g.date);
      const pElo = engine.eloProbability(g.home, g.away);
      oos.push({
        date: g.date,
        actual: g.homeScore > g.awayScore ? 0 : 1,
        byModel: [[pElo, 1 - pElo], predict(logit, x)],
      });
      since++;
    }

    if (engine.played(g.home) >= 10 && engine.played(g.away) >= 10) {
      X.push(engine.extract(g.home, g.away, g.date));
      Y.push(g.homeScore > g.awayScore ? 0 : 1);
      dates.push(g.date);
    }
    engine.push(g);
  }

  if (oos.length < 100) throw new Error("Historique NBA insuffisant pour valider le modèle.");

  const cut = Math.floor(oos.length * 0.6);
  const cal = oos.slice(0, cut);
  const test = oos.slice(cut);

  const blendConfig = fitBlend(
    [cal.map((p) => p.byModel[0]), cal.map((p) => p.byModel[1])],
    cal.map((p) => p.actual),
  );
  for (const p of oos) {
    p.byModel[2] = blend([p.byModel[0], p.byModel[1]], blendConfig.weights, blendConfig.temperature);
  }

  const base = baseline(test.map((p) => p.actual), 2);
  const baseLl = logLoss(test.map((p) => ({ probs: base, actual: p.actual })));
  const names = ["Elo seul", "Logistique", "Mélange"];

  const report = (name: string, rows: Scored[]) => ({
    name,
    logLoss: logLoss(rows),
    brier: brier(rows),
    accuracy: accuracy(rows),
    calibrationError: expectedCalibrationError(rows),
    skill: (1 - logLoss(rows) / baseLl) * 100,
  });

  const window = 150;
  const trend: NbaPipeline["trend"] = [];
  for (let i = window; i <= oos.length; i += Math.max(1, Math.floor(window / 4))) {
    const slice = oos.slice(i - window, i);
    trend.push({
      date: slice[slice.length - 1].date,
      index: i,
      models: names.map((_, k) =>
        brier(slice.map((p) => ({ probs: p.byModel[k], actual: p.actual }))),
      ),
      baseline: brier(slice.map((p) => ({ probs: base, actual: p.actual }))),
    });
  }

  const final = train(X, Y, dates, { classes: 2, epochs: 1200 });

  return {
    engine,
    logit: final,
    blendConfig,
    teams: engine.table().map((t) => t.team).sort((a, b) => a.localeCompare(b, "fr")),
    reports: names.map((n, i) =>
      report(n, test.map((p) => ({ probs: p.byModel[i], actual: p.actual }))),
    ),
    trend,
    calibration: calibration(test.map((p) => ({ probs: p.byModel[2], actual: p.actual }))),
    featureImportance: importance(final, NBA_FEATURES).map((f) => ({
      ...f,
      name: LABELS[f.name] ?? f.name,
    })),
    holdout: test.length,
    games: ordered.length,
  };
}

export interface NbaEnsembleForecast {
  home: string;
  away: string;
  homeWin: number;
  awayWin: number;
  spread: number;
  total: number;
  byModel: { name: string; probs: number[] }[];
  drivers: { name: string; value: number; contribution: number }[];
  confidence: number;
}

export function predictNba(
  p: NbaPipeline,
  home: string,
  away: string,
  date = new Date().toISOString().slice(0, 10),
): NbaEnsembleForecast | null {
  if (!p.engine.played(home) || !p.engine.played(away)) return null;

  const x = p.engine.extract(home, away, date);
  const pElo = p.engine.eloProbability(home, away);
  const pLogit = predict(p.logit, x);
  const probs = blend([[pElo, 1 - pElo], pLogit], p.blendConfig.weights, p.blendConfig.temperature);

  const w = p.logit.weights;
  const drivers = NBA_FEATURES.map((name, j) => ({
    name: LABELS[name] ?? name,
    value: x[j],
    contribution: (w[0][j] - w[1][j]) * ((x[j] - p.logit.mean[j]) / p.logit.sd[j]),
  })).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const entropy = -probs.reduce((a, q) => a + q * Math.log(Math.max(1e-12, q)), 0);

  return {
    home,
    away,
    homeWin: probs[0],
    awayWin: probs[1],
    // Conversion probabilité → écart de points via l'échelle Elo.
    spread: (Math.log10(probs[0] / probs[1]) * 400) / ELO_PER_POINT,
    total: p.engine.totalEstimate(home, away),
    byModel: [
      { name: "Elo seul", probs: [pElo, 1 - pElo] },
      { name: "Logistique", probs: pLogit },
      { name: "Mélange", probs },
    ],
    drivers,
    confidence: 1 - entropy / Math.log(2),
  };
}
