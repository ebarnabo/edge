/**
 * Résultats NBA depuis balldontlie (palier gratuit, 5 requêtes/min).
 *   npm run ingest:nba
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Game } from "../src/lib/sports/elo-nba.js";

const KEY = process.env.BALLDONTLIE_KEY;
const BASE = "https://api.balldontlie.io/nba/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ApiGame {
  date: string;
  status: string;
  home_team_score: number;
  visitor_team_score: number;
  home_team: { full_name: string };
  visitor_team: { full_name: string };
}

async function fetchSeason(season: number): Promise<Game[]> {
  const games: Game[] = [];
  let cursor: string | null = null;

  for (;;) {
    const url = new URL(`${BASE}/games`);
    url.searchParams.set("seasons[]", String(season));
    url.searchParams.set("per_page", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, { headers: { Authorization: KEY! } });
    if (res.status === 429) {
      await sleep(60_000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as {
      data: ApiGame[];
      meta: { next_cursor?: string | number };
    };

    for (const g of json.data) {
      if (!/final/i.test(g.status)) continue;
      games.push({
        date: g.date.slice(0, 10),
        home: g.home_team.full_name,
        away: g.visitor_team.full_name,
        homeScore: g.home_team_score,
        awayScore: g.visitor_team_score,
      });
    }

    if (!json.meta.next_cursor) break;
    cursor = String(json.meta.next_cursor);
    await sleep(12_500); // 5 requêtes/min
  }
  return games;
}

if (!KEY) {
  console.error("BALLDONTLIE_KEY manquant. Voir .env.example");
  process.exit(1);
}

const current = new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1;
const games: Game[] = [];

for (const season of [current, current - 1, current - 2]) {
  console.log(`Saison ${season}`);
  try {
    const batch = await fetchSeason(season);
    games.push(...batch);
    console.log(`  · ${batch.length} matchs`);
  } catch (err) {
    console.warn(`  ! ${(err as Error).message}`);
  }
}

await mkdir(path.join(process.cwd(), "data"), { recursive: true });
await writeFile(
  path.join(process.cwd(), "data", "nba.json"),
  JSON.stringify({ updatedAt: new Date().toISOString(), games }),
  "utf8",
);
console.log(`= ${games.length} matchs`);
