import type { ScanRow, ScanRowBase } from "./scan-types";
import { favoritePick, maxWinProb } from "./scan-types";

export type ViewFilter = "all" | "faciles" | "value" | "cotes";
export type SortMode = "faciles" | "opportunites" | "date";

export interface ScanFilterOptions {
  query?: string;
  view?: ViewFilter;
  /** Probabilité minimale du favori (0–1) */
  minProb?: number;
  sort?: SortMode;
  competition?: string | null;
}

export function filterScanRows(rows: ScanRow[], opts: ScanFilterOptions): ScanRow[] {
  const query = opts.query?.trim().toLowerCase() ?? "";
  const view = opts.view ?? "all";
  const minProb = opts.minProb ?? 0;
  const competition = opts.competition ?? null;

  return rows.filter((row) => {
    if (competition) {
      if (competition === "NBA" ? row.fixture.sport !== "nba" : row.fixture.competition !== competition) {
        return false;
      }
    }

    if (query) {
      const home = row.fixture.home.toLowerCase();
      const away = row.fixture.away.toLowerCase();
      if (!home.includes(query) && !away.includes(query)) return false;
    }

    const winProb = maxWinProb(row);

    if (minProb > 0 && winProb < minProb) return false;

    if (view === "value" && !row.bestEdge) return false;
    if (view === "cotes" && !row.market) return false;
    if (view === "faciles" && winProb < 0.6) return false;

    return true;
  });
}

export function sortScanRows(rows: ScanRow[], sort: SortMode): ScanRow[] {
  const sorted = [...rows];

  switch (sort) {
    case "faciles":
      sorted.sort((a, b) => {
        const probDiff = maxWinProb(b) - maxWinProb(a);
        if (probDiff !== 0) return probDiff;
        return b.confidence - a.confidence;
      });
      break;
    case "opportunites":
      sorted.sort((a, b) => {
        const edgeA = a.bestEdge?.edge ?? -1;
        const edgeB = b.bestEdge?.edge ?? -1;
        if (edgeB !== edgeA) return edgeB - edgeA;
        return maxWinProb(b) - maxWinProb(a);
      });
      break;
    case "date":
      sorted.sort((a, b) => a.fixture.commenceTime.localeCompare(b.fixture.commenceTime));
      break;
  }

  return sorted;
}

export function processScanRows(rows: ScanRow[], opts: ScanFilterOptions): ScanRow[] {
  const filtered = filterScanRows(rows, opts);
  return sortScanRows(filtered, opts.sort ?? (opts.view === "faciles" ? "faciles" : "opportunites"));
}

export function groupRowsByDate(rows: ScanRow[]) {
  const groups = new Map<string, ScanRow[]>();
  for (const row of rows) {
    const date = row.fixture.commenceTime.slice(0, 10);
    const list = groups.get(date) ?? [];
    list.push(row);
    groups.set(date, list);
  }
  return [...groups.entries()].map(([date, groupRows]) => ({ date, rows: groupRows }));
}

/** Résumé lisible pour l'en-tête de carte. */
export function pickSummary(row: ScanRowBase | ScanRow) {
  const fav = favoritePick(row);
  return {
    team: fav.label,
    prob: fav.prob,
    isDraw: fav.label === "Match nul",
  };
}
