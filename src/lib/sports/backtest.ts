import { fit, forecast, type Match } from "./dixon-coles";
import { FeatureEngine, outcomeOf, FEATURE_NAMES } from "./features";
import { train, predict, importance, type LogisticModel } from "./logistic";
import { blend, fitBlend, type BlendConfig } from "./ensemble";
import {
  accuracy,
  baseline,
  brier,
  calibration,
  expectedCalibrationError,
  logLoss,
  rps,
  type Scored,
} from "./metrics";

/**
 * Validation par origine glissante.
 *
 * À chaque bloc, les modèles sont réajustés sur le passé strict puis évalués
 * sur les matchs suivants, jamais vus. C'est la seule procédure qui répond à
 * la question « ce modèle aurait-il été utile la saison dernière ? » — un
 * ajustement sur l'ensemble des données produit toujours de belles courbes
 * et ne prouve rien.
 */

export const MODEL_NAMES = ["Dixon–Coles", "Logistique", "Mélange"] as const;

export interface Prediction {
  date: string;
  home: string;
  away: string;
  actual: number;
  byModel: number[][]; // [modèle][classe]
}

export interface ModelReport {
  name: string;
  logLoss: number;
  rps: number;
  brier: number;
  accuracy: number;
  calibrationError: number;
  /** Gain de log-perte face aux fréquences de base, en % */
  skill: number;
}

export interface BacktestResult {
  predictions: Prediction[];
  reports: ModelReport[];
  baselineReport: ModelReport;
  blendConfig: BlendConfig;
  calibration: { from: number; to: number; predicted: number; observed: number; count: number }[];
  /** RPS glissant, une entrée par bloc évalué */
  trend: { date: string; index: number; models: number[]; baseline: number }[];
  featureImportance: { name: string; weight: number; direction: number }[];
  holdout: number;
  evaluated: number;
}

export interface BacktestOptions {
  /** Matchs d'amorçage avant la première évaluation */
  warmup?: number;
  /** Nombre de matchs prédits entre deux réajustements */
  step?: number;
  /** Part des prédictions réservée au calage du mélange */
  calibrationShare?: number;
  /** Largeur de la fenêtre pour le RPS glissant */
  window?: number;
  dcIterations?: number;
  logisticEpochs?: number;
}

export function backtest(matches: Match[], opts: BacktestOptions = {}): BacktestResult {
  const {
    warmup = 200,
    step = 40,
    calibrationShare = 0.6,
    window = 60,
    dcIterations = 300,
    logisticEpochs = 320,
  } = opts;

  const ordered = [...matches].sort((a, b) => a.date.localeCompare(b.date));
  if (ordered.length < warmup + step * 2) {
    throw new Error(
      `Historique insuffisant : ${ordered.length} matchs, il en faut au moins ${warmup + step * 2}.`,
    );
  }

  const engine = new FeatureEngine();
  const history: Match[] = [];
  const trainX: number[][] = [];
  const trainY: number[] = [];
  const trainDates: string[] = [];
  const predictions: Prediction[] = [];

  let dcModel: ReturnType<typeof fit> | null = null;
  let logit: LogisticModel | null = null;
  let sinceRefit = Infinity;
  let lastImportance: ReturnType<typeof importance> = [];

  for (const m of ordered) {
    const ready = history.length >= warmup && engine.played(m.home) >= 6 && engine.played(m.away) >= 6;

    if (ready && sinceRefit >= step) {
      dcModel = fit(history, { iterations: dcIterations });
      if (trainX.length >= 80) {
        logit = train(trainX, trainY, trainDates, { epochs: logisticEpochs });
        lastImportance = importance(logit, FEATURE_NAMES);
      }
      sinceRefit = 0;
    }

    if (ready) {
      // Le compteur avance dès que l'évaluation est possible : sinon, un premier
      // réajustement sans logistique disponible bloquerait tous les suivants.
      sinceRefit++;

      if (dcModel && logit) {
        const x = engine.extract(m.home, m.away, m.date);
        const f = forecast(dcModel, m.home, m.away);
        if (f) {
          predictions.push({
            date: m.date,
            home: m.home,
            away: m.away,
            actual: outcomeOf(m),
            byModel: [[f.homeWin, f.draw, f.awayWin], predict(logit, x)],
          });
        }
      }
    }

    // Le match rejoint le passé seulement après avoir été prédit.
    if (engine.played(m.home) >= 6 && engine.played(m.away) >= 6) {
      trainX.push(engine.extract(m.home, m.away, m.date));
      trainY.push(outcomeOf(m));
      trainDates.push(m.date);
    }
    engine.push(m);
    history.push(m);
  }

  if (predictions.length < 60) {
    throw new Error("Trop peu de prédictions hors échantillon pour conclure.");
  }

  // Le poids du mélange est appris sur la première tranche, puis figé.
  const cut = Math.floor(predictions.length * calibrationShare);
  const calSet = predictions.slice(0, cut);
  const testSet = predictions.slice(cut);

  const blendConfig = fitBlend(
    [calSet.map((p) => p.byModel[0]), calSet.map((p) => p.byModel[1])],
    calSet.map((p) => p.actual),
  );

  for (const p of predictions) {
    p.byModel[2] = blend(
      [p.byModel[0], p.byModel[1]],
      blendConfig.weights,
      blendConfig.temperature,
    );
  }

  const base = baseline(testSet.map((p) => p.actual));
  const baseRows: Scored[] = testSet.map((p) => ({ probs: base, actual: p.actual }));
  const baseLl = logLoss(baseRows);

  const report = (name: string, rows: Scored[]): ModelReport => ({
    name,
    logLoss: logLoss(rows),
    rps: rps(rows),
    brier: brier(rows),
    accuracy: accuracy(rows),
    calibrationError: expectedCalibrationError(rows),
    skill: (1 - logLoss(rows) / baseLl) * 100,
  });

  const reports = MODEL_NAMES.map((name, i) =>
    report(name, testSet.map((p) => ({ probs: p.byModel[i], actual: p.actual }))),
  );

  // Courbe de tendance : RPS sur fenêtre glissante, tous modèles superposés.
  const trend: BacktestResult["trend"] = [];
  for (let i = window; i <= predictions.length; i += Math.max(1, Math.floor(window / 4))) {
    const slice = predictions.slice(i - window, i);
    trend.push({
      date: slice[slice.length - 1].date,
      index: i,
      models: MODEL_NAMES.map((_, k) =>
        rps(slice.map((p) => ({ probs: p.byModel[k], actual: p.actual }))),
      ),
      baseline: rps(slice.map((p) => ({ probs: base, actual: p.actual }))),
    });
  }

  return {
    predictions,
    reports,
    baselineReport: report("Fréquences de base", baseRows),
    blendConfig,
    calibration: calibration(
      testSet.map((p) => ({ probs: p.byModel[2], actual: p.actual })),
    ),
    trend,
    featureImportance: lastImportance,
    holdout: testSet.length,
    evaluated: predictions.length,
  };
}
