import { predictMatch, type Pipeline } from "./football-pipeline";
import { predictNba, type NbaPipeline } from "./nba-pipeline";
import { aggregate, matchTeam, valueAgainstMarket, type MarketEvent, type ValuedOutcome } from "./odds";
import { loadFixtures, loadOdds, type Fixture } from "@/lib/data";
import { footballPipeline, nbaPipeline } from "./models";

/**
 * Balayage des matchs à venir.
 *
 * Chaque rencontre est prédite par l'ensemble validé, puis confrontée au
 * marché quand des cotes sont disponibles. Le classement se fait sur l'écart
 * au consensus, pondéré par l'apport mesuré du modèle sur ce championnat :
 * un écart de 3 % annoncé par un modèle qui ne bat la ligne de base que de
 * 1 % ne vaut pas un écart de 3 % annoncé par un modèle à 8 %.
 */

export interface ScanRow {
  fixture: Fixture;
  probs: number[];
  labels: string[];
  confidence: number;
  /** Divergence maximale entre les modèles de l'ensemble, en points */
  disagreement: number;
  market: {
    books: number;
    sharpBook: string | null;
    averageMargin: number;
    bestPriceGain: number;
    outcomes: ValuedOutcome[];
  } | null;
  /** Meilleure occasion du match, si elle dépasse le seuil */
  bestEdge: ValuedOutcome | null;
  /** Apport du modèle sur ce championnat, en % de log-perte */
  modelSkill: number;
  extra?: { lambda: number; mu: number; over25: number } | { spread: number; total: number };
}

export interface ScanResult {
  rows: ScanRow[];
  fixturesUpdatedAt: string | null;
  oddsUpdatedAt: string | null;
  withOdds: number;
  opportunities: number;
}

function findEvent(events: MarketEvent[], fixture: Fixture): MarketEvent | null {
  const sameDay = events.filter(
    (e) => e.sport === fixture.sport && e.commenceTime.slice(0, 10) === fixture.date,
  );
  const pool = sameDay.length ? sameDay : events.filter((e) => e.sport === fixture.sport);

  for (const e of pool) {
    const home = matchTeam(fixture.home, [e.home]);
    const away = matchTeam(fixture.away, [e.away]);
    if (home && away) return e;
  }
  return null;
}

export async function scanFixtures(opts: { bankroll?: number; threshold?: number } = {}): Promise<ScanResult> {
  const { bankroll = 100, threshold = 0.03 } = opts;

  const [fixtureFile, oddsFile] = await Promise.all([loadFixtures(), loadOdds()]);
  const fixtures = fixtureFile?.fixtures ?? [];
  const events = oddsFile?.events ?? [];

  const football = new Map<string, Pipeline | null>();
  let nba: NbaPipeline | null = null;
  const rows: ScanRow[] = [];

  for (const fixture of fixtures) {
    let probs: number[] | null = null;
    let labels: string[] = [];
    let confidence = 0;
    let disagreement = 0;
    let skill = 0;
    let extra: ScanRow["extra"];

    if (fixture.sport === "football") {
      if (!football.has(fixture.competition)) {
        football.set(fixture.competition, (await footballPipeline(fixture.competition)).pipeline);
      }
      const pipeline = football.get(fixture.competition);
      if (!pipeline) continue;

      const home = matchTeam(fixture.home, pipeline.teams);
      const away = matchTeam(fixture.away, pipeline.teams);
      if (!home || !away) continue;

      const f = predictMatch(pipeline, home, away, fixture.date);
      if (!f) continue;

      probs = [f.probs.homeWin, f.probs.draw, f.probs.awayWin];
      labels = [fixture.home, "Match nul", fixture.away];
      confidence = f.confidence;
      disagreement = Math.max(
        ...f.byModel[0].probs.map((p, i) => Math.abs(p - f.byModel[1].probs[i])),
      );
      skill = pipeline.validation.reports.at(-1)?.skill ?? 0;
      extra = { lambda: f.goals.lambda, mu: f.goals.mu, over25: f.goals.over25 };
    } else {
      if (!nba) nba = (await nbaPipeline()).pipeline;
      if (!nba) continue;

      const home = matchTeam(fixture.home, nba.teams);
      const away = matchTeam(fixture.away, nba.teams);
      if (!home || !away) continue;

      const f = predictNba(nba, home, away, fixture.date);
      if (!f) continue;

      probs = [f.homeWin, f.awayWin];
      labels = [fixture.home, fixture.away];
      confidence = f.confidence;
      disagreement = Math.max(
        ...f.byModel[0].probs.map((p, i) => Math.abs(p - f.byModel[1].probs[i])),
      );
      skill = nba.reports.at(-1)?.skill ?? 0;
      extra = { spread: f.spread, total: f.total };
    }

    if (!probs) continue;

    const event = findEvent(events, fixture);
    const market = event ? aggregate(event) : null;
    const valued = market ? valueAgainstMarket(market, probs, { bankroll, threshold }) : null;
    const best = valued?.filter((v) => v.verdict === "value").sort((a, b) => b.edge - a.edge)[0] ?? null;

    rows.push({
      fixture,
      probs,
      labels,
      confidence,
      disagreement,
      modelSkill: skill,
      extra,
      market:
        market && valued
          ? {
              books: market.books,
              sharpBook: market.sharpBook,
              averageMargin: market.averageMargin,
              bestPriceGain: market.bestPriceGain,
              outcomes: valued,
            }
          : null,
      bestEdge: best,
    });
  }

  // Classement : les occasions d'abord, par écart pondéré du crédit du modèle.
  rows.sort((a, b) => {
    const score = (r: ScanRow) =>
      r.bestEdge ? r.bestEdge.edge * Math.max(0.2, Math.min(1, r.modelSkill / 5)) : -1;
    const diff = score(b) - score(a);
    return diff !== 0 ? diff : a.fixture.commenceTime.localeCompare(b.fixture.commenceTime);
  });

  return {
    rows,
    fixturesUpdatedAt: fixtureFile?.updatedAt ?? null,
    oddsUpdatedAt: oddsFile?.updatedAt ?? null,
    withOdds: rows.filter((r) => r.market).length,
    opportunities: rows.filter((r) => r.bestEdge).length,
  };
}
