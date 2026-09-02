import type { ScanRow } from "./scan";

export type ViewFilter = "all" | "value" | "favoris" | "cotes";

export interface ScanFilterOptions {
  query?: string;
  view?: ViewFilter;
  /** Probabilité minimale du favori (0–1) pour le filtre « favoris » */
  minProb?: number;
}

export function filterScanRows(rows: ScanRow[], opts: ScanFilterOptions): ScanRow[] {
  const query = opts.query?.trim().toLowerCase() ?? "";
  const view = opts.view ?? "all";
  const minProb = opts.minProb ?? 0.55;

  return rows.filter((row) => {
    if (query) {
      const home = row.fixture.home.toLowerCase();
      const away = row.fixture.away.toLowerCase();
      if (!home.includes(query) && !away.includes(query)) return false;
    }

    if (view === "value" && !row.bestEdge) return false;
    if (view === "cotes" && !row.market) return false;
    if (view === "favoris" && Math.max(...row.probs) < minProb) return false;

    return true;
  });
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
