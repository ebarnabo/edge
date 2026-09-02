import { valueAgainstMarket, type AggregatedMarket, type ValuedOutcome } from "./odds";
import type { Fixture } from "@/lib/data";

export interface ScanRowBase {
  fixture: Fixture;
  probs: number[];
  labels: string[];
  confidence: number;
  disagreement: number;
  modelSkill: number;
  extra?: { lambda: number; mu: number; over25: number } | { spread: number; total: number };
  marketBase: AggregatedMarket | null;
}

export interface ScanRow extends Omit<ScanRowBase, "marketBase"> {
  market: {
    books: number;
    sharpBook: string | null;
    averageMargin: number;
    bestPriceGain: number;
    outcomes: ValuedOutcome[];
  } | null;
  bestEdge: ValuedOutcome | null;
}

export interface ScanCacheFile {
  key: string;
  fixturesUpdatedAt: string;
  oddsUpdatedAt: string;
  rows: ScanRowBase[];
}

export function scanCacheKey(fixturesUpdatedAt: string, oddsUpdatedAt: string) {
  return `${fixturesUpdatedAt}|${oddsUpdatedAt}`;
}

export function maxWinProb(row: ScanRowBase | ScanRow): number {
  return Math.max(...row.probs);
}

export function favoritePick(row: ScanRowBase | ScanRow): { label: string; prob: number; index: number } {
  const index = row.probs.indexOf(Math.max(...row.probs));
  return { label: row.labels[index], prob: row.probs[index], index };
}

export function applyScanParams(
  base: ScanRowBase[],
  opts: { bankroll?: number; threshold?: number },
): ScanRow[] {
  const { bankroll = 100, threshold = 0.03 } = opts;

  const rows: ScanRow[] = base.map((row) => {
    const valued = row.marketBase
      ? valueAgainstMarket(row.marketBase, row.probs, { bankroll, threshold })
      : null;
    const best = valued?.filter((v) => v.verdict === "value").sort((a, b) => b.edge - a.edge)[0] ?? null;

    const { marketBase, ...rest } = row;
    return {
      ...rest,
      market:
        marketBase && valued
          ? {
              books: marketBase.books,
              sharpBook: marketBase.sharpBook,
              averageMargin: marketBase.averageMargin,
              bestPriceGain: marketBase.bestPriceGain,
              outcomes: valued,
            }
          : null,
      bestEdge: best,
    };
  });

  rows.sort((a, b) => {
    const score = (r: ScanRow) =>
      r.bestEdge ? r.bestEdge.edge * Math.max(0.2, Math.min(1, r.modelSkill / 5)) : -1;
    const diff = score(b) - score(a);
    return diff !== 0 ? diff : a.fixture.commenceTime.localeCompare(b.fixture.commenceTime);
  });

  return rows;
}
