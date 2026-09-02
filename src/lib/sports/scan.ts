import { predictMatch, type Pipeline } from "./football-pipeline";
import { predictNba, type NbaPipeline } from "./nba-pipeline";
import { aggregate, matchTeam, type MarketEvent } from "./odds";
import { loadFixtures, loadOdds, type Fixture } from "@/lib/data";
import { footballPipeline, nbaPipeline } from "./models";
import {
  applyScanParams,
  scanCacheKey,
  type ScanCacheFile,
  type ScanRowBase,
} from "./scan-types";

export type { ScanRow, ScanRowBase, ScanCacheFile } from "./scan-types";
export { applyScanParams, maxWinProb, favoritePick, scanCacheKey } from "./scan-types";

export interface ScanResult {
  rows: ReturnType<typeof applyScanParams>;
  fixturesUpdatedAt: string | null;
  oddsUpdatedAt: string | null;
  withOdds: number;
  opportunities: number;
  fromCache: boolean;
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

/** Prédictions + marché — partie coûteuse, cacheable. */
export async function buildScanBase(): Promise<{
  rows: ScanRowBase[];
  fixturesUpdatedAt: string | null;
  oddsUpdatedAt: string | null;
}> {
  const [fixtureFile, oddsFile] = await Promise.all([loadFixtures(), loadOdds()]);
  const fixtures = fixtureFile?.fixtures ?? [];
  const events = oddsFile?.events ?? [];

  const footballCodes = [
    ...new Set(fixtures.filter((f) => f.sport === "football").map((f) => f.competition)),
  ];
  const needsNba = fixtures.some((f) => f.sport === "nba");

  const [footballResults, nbaResult] = await Promise.all([
    Promise.all(footballCodes.map(async (code) => [code, await footballPipeline(code)] as const)),
    needsNba ? nbaPipeline() : Promise.resolve({ pipeline: null as NbaPipeline | null }),
  ]);

  const football = new Map<string, Pipeline | null>(
    footballResults.map(([code, { pipeline }]) => [code, pipeline]),
  );
  const nba = nbaResult.pipeline;
  const rows: ScanRowBase[] = [];

  for (const fixture of fixtures) {
    let probs: number[] | null = null;
    let labels: string[] = [];
    let confidence = 0;
    let disagreement = 0;
    let skill = 0;
    let extra: ScanRowBase["extra"];

    if (fixture.sport === "football") {
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
    const marketBase = event ? aggregate(event) : null;

    rows.push({
      fixture,
      probs,
      labels,
      confidence,
      disagreement,
      modelSkill: skill,
      extra,
      marketBase,
    });
  }

  return {
    rows,
    fixturesUpdatedAt: fixtureFile?.updatedAt ?? null,
    oddsUpdatedAt: oddsFile?.updatedAt ?? null,
  };
}

let memoryCache: {
  key: string;
  base: ScanRowBase[];
  fixturesUpdatedAt: string | null;
  oddsUpdatedAt: string | null;
} | null = null;

export async function getScanBase(): Promise<{
  rows: ScanRowBase[];
  fixturesUpdatedAt: string | null;
  oddsUpdatedAt: string | null;
  fromCache: boolean;
}> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");

  const [fixtureFile, oddsFile] = await Promise.all([loadFixtures(), loadOdds()]);
  const fixturesUpdatedAt = fixtureFile?.updatedAt ?? "";
  const oddsUpdatedAt = oddsFile?.updatedAt ?? "";
  const key = scanCacheKey(fixturesUpdatedAt, oddsUpdatedAt);

  if (memoryCache?.key === key) {
    return {
      rows: memoryCache.base,
      fixturesUpdatedAt: memoryCache.fixturesUpdatedAt,
      oddsUpdatedAt: memoryCache.oddsUpdatedAt,
      fromCache: true,
    };
  }

  try {
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "scan-cache.json"), "utf8"),
    ) as ScanCacheFile;
    if (raw.key === key && raw.rows.length) {
      memoryCache = {
        key,
        base: raw.rows,
        fixturesUpdatedAt: raw.fixturesUpdatedAt,
        oddsUpdatedAt: raw.oddsUpdatedAt,
      };
      return { rows: raw.rows, fixturesUpdatedAt, oddsUpdatedAt, fromCache: true };
    }
  } catch {
    /* cache absent ou périmé */
  }

  const built = await buildScanBase();
  memoryCache = {
    key,
    base: built.rows,
    fixturesUpdatedAt: built.fixturesUpdatedAt,
    oddsUpdatedAt: built.oddsUpdatedAt,
  };
  return { ...built, fromCache: false };
}

export async function scanFixtures(opts: { bankroll?: number; threshold?: number } = {}): Promise<ScanResult> {
  const { rows: base, fixturesUpdatedAt, oddsUpdatedAt, fromCache } = await getScanBase();
  const rows = applyScanParams(base, opts);

  return {
    rows,
    fixturesUpdatedAt,
    oddsUpdatedAt,
    withOdds: rows.filter((r) => r.market).length,
    opportunities: rows.filter((r) => r.bestEdge).length,
    fromCache,
  };
}
