/**
 * Résultats de football depuis football-data.org (palier gratuit).
 *   npm run ingest:football -- PL FL1 PD
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Match } from "../src/lib/sports/dixon-coles.js";

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const BASE = "https://api.football-data.org/v4";

export const COMPETITIONS: Record<string, string> = {
  PL: "Premier League",
  FL1: "Ligue 1",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
  DED: "Eredivisie",
  PPL: "Primeira Liga",
  CL: "Ligue des champions",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchSeason(code: string, season: number): Promise<Match[]> {
  const url = `${BASE}/competitions/${code}/matches?season=${season}&status=FINISHED`;
  const res = await fetch(url, { headers: { "X-Auth-Token": TOKEN! } });
  if (res.status === 429) {
    console.log("  · quota atteint, pause 60 s");
    await sleep(60_000);
    return fetchSeason(code, season);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${code} ${season}`);

  const json = (await res.json()) as {
    matches: {
      utcDate: string;
      homeTeam: { name: string };
      awayTeam: { name: string };
      score: { fullTime: { home: number | null; away: number | null } };
    }[];
  };

  return json.matches
    .filter((m) => m.score.fullTime.home !== null && m.score.fullTime.away !== null)
    .map((m) => ({
      date: m.utcDate.slice(0, 10),
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      homeGoals: m.score.fullTime.home!,
      awayGoals: m.score.fullTime.away!,
    }));
}

if (!TOKEN) {
  console.error("FOOTBALL_DATA_TOKEN manquant. Voir .env.example");
  process.exit(1);
}

const codes = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(COMPETITIONS);
const current = new Date().getFullYear();
const seasons = [current, current - 1, current - 2];

await mkdir(path.join(process.cwd(), "data"), { recursive: true });

for (const code of codes) {
  console.log(`${COMPETITIONS[code] ?? code}`);
  const matches: Match[] = [];
  for (const season of seasons) {
    try {
      const batch = await fetchSeason(code, season);
      matches.push(...batch);
      console.log(`  · ${batch.length} matchs — saison ${season}`);
    } catch (err) {
      console.warn(`  ! ${(err as Error).message}`);
    }
    await sleep(6500); // 10 requêtes/min sur le palier gratuit
  }
  if (!matches.length) continue;
  await writeFile(
    path.join(process.cwd(), "data", `football-${code}.json`),
    JSON.stringify({ competition: code, updatedAt: new Date().toISOString(), matches }),
    "utf8",
  );
  console.log(`  = ${matches.length} matchs\n`);
}
