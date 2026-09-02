import type { ScanRow } from "./scan-types";

export type ViewFilter = "all" | "faciles" | "value" | "cotes";
export type SortMode = "faciles" | "opportunites" | "date";
export type DayFilter = "all" | "today" | "tomorrow" | "week" | string;

export interface ScanFilterOptions {
  query?: string;
  view?: ViewFilter;
  minProb?: number;
  sort?: SortMode;
  competition?: string | null;
  day?: DayFilter;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function matchDay(iso: string, filter: DayFilter): boolean {
  if (filter === "all") return true;

  const matchDay = startOfDay(new Date(iso.slice(0, 10)));
  const today = startOfDay(new Date());

  if (filter === "today") return matchDay.getTime() === today.getTime();

  if (filter === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return matchDay.getTime() === tomorrow.getTime();
  }

  if (filter === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    return matchDay >= today && matchDay <= end;
  }

  return iso.slice(0, 10) === filter;
}

export function filterScanRows(rows: ScanRow[], opts: ScanFilterOptions): ScanRow[] {
  const query = opts.query?.trim().toLowerCase() ?? "";
  const view = opts.view ?? "all";
  const minProb = opts.minProb ?? 0;
  const competition = opts.competition ?? null;
  const day = opts.day ?? "all";

  return rows.filter((row) => {
    if (competition) {
      if (competition === "NBA" ? row.fixture.sport !== "nba" : row.fixture.competition !== competition) {
        return false;
      }
    }

    if (!matchDay(row.fixture.commenceTime, day)) return false;

    if (query) {
      const home = row.fixture.home.toLowerCase();
      const away = row.fixture.away.toLowerCase();
      if (!home.includes(query) && !away.includes(query)) return false;
    }

    const winProb = Math.max(...row.probs);

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
        const probDiff = Math.max(...b.probs) - Math.max(...a.probs);
        if (probDiff !== 0) return probDiff;
        return b.confidence - a.confidence;
      });
      break;
    case "opportunites":
      sorted.sort((a, b) => {
        const edgeA = a.bestEdge?.edge ?? -1;
        const edgeB = b.bestEdge?.edge ?? -1;
        if (edgeB !== edgeA) return edgeB - edgeA;
        return Math.max(...b.probs) - Math.max(...a.probs);
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

export function extractAvailableDates(rows: ScanRow[]): string[] {
  const dates = new Set<string>();
  for (const row of rows) {
    dates.add(row.fixture.commenceTime.slice(0, 10));
  }
  return [...dates].sort();
}

export function formatDayChip(iso: string): string {
  const d = new Date(iso);
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = startOfDay(d);

  if (day.getTime() === today.getTime()) return "Aujourd'hui";
  if (day.getTime() === tomorrow.getTime()) return "Demain";

  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
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

export function pickSummary(row: ScanRow) {
  const index = row.probs.indexOf(Math.max(...row.probs));
  return {
    team: row.labels[index],
    prob: row.probs[index],
    isDraw: row.labels[index] === "Match nul",
  };
}
