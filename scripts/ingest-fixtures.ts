/**
 * Matchs à venir : football-data pour le foot, balldontlie pour la NBA.
 *   npm run ingest:fixtures
 *   npm run ingest:fixtures -- FL1 PL
 */
import "./load-env.js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { COMPETITIONS } from "./competitions.js";

const FOOTBALL = process.env.FOOTBALL_DATA_TOKEN;
const NBA = process.env.BALLDONTLIE_KEY;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(process.cwd(), "data");

export interface Fixture {
  id: string;
  sport: "football" | "nba";
  competition: string;
  date: string;
  commenceTime: string;
  home: string;
  away: string;
}

async function football(codes: string[]): Promise<Fixture[]> {
  if (!FOOTBALL) return [];
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const out: Fixture[] = [];

  for (const code of codes) {
    const url = `https://api.football-data.org/v4/competitions/${code}/matches?status=SCHEDULED&dateFrom=${from}&dateTo=${to}`;
    try {
      const res = await fetch(url, { headers: { "X-Auth-Token": FOOTBALL } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        matches: { id: number; utcDate: string; homeTeam: { name: string }; awayTeam: { name: string } }[];
      };
      for (const m of json.matches) {
        out.push({
          id: `fd-${m.id}`,
          sport: "football",
          competition: code,
          date: m.utcDate.slice(0, 10),
          commenceTime: m.utcDate,
          home: m.homeTeam.name,
          away: m.awayTeam.name,
        });
      }
      console.log(`  · ${json.matches.length} matchs — ${COMPETITIONS[code] ?? code}`);
    } catch (err) {
      console.warn(`  ! ${code} : ${(err as Error).message}`);
    }
    await sleep(6500);
  }
  return out;
}

async function nba(): Promise<Fixture[]> {
  if (!NBA) return [];
  const out: Fixture[] = [];
  const dates: string[] = [];
  for (let i = 0; i < 8; i++) {
    dates.push(new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10));
  }

  const url = new URL("https://api.balldontlie.io/nba/v1/games");
  for (const d of dates) url.searchParams.append("dates[]", d);
  url.searchParams.set("per_page", "100");

  try {
    const res = await fetch(url, { headers: { Authorization: NBA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      data: {
        id: number;
        date: string;
        status: string;
        home_team: { full_name: string };
        visitor_team: { full_name: string };
      }[];
    };
    for (const g of json.data) {
      if (/final/i.test(g.status)) continue;
      out.push({
        id: `bdl-${g.id}`,
        sport: "nba",
        competition: "NBA",
        date: g.date.slice(0, 10),
        commenceTime: `${g.date.slice(0, 10)}T00:00:00Z`,
        home: g.home_team.full_name,
        away: g.visitor_team.full_name,
      });
    }
    console.log(`  · ${out.length} matchs NBA`);
  } catch (err) {
    console.warn(`  ! NBA : ${(err as Error).message}`);
  }
  return out;
}

const codes = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(COMPETITIONS);
console.log("Matchs à venir");
const fixtures = [...(await football(codes)), ...(await nba())];
fixtures.sort((a, b) => a.commenceTime.localeCompare(b.commenceTime));

await mkdir(OUT, { recursive: true });
await writeFile(
  path.join(OUT, "fixtures.json"),
  JSON.stringify({ updatedAt: new Date().toISOString(), fixtures }),
  "utf8",
);
console.log(`= ${fixtures.length} matchs enregistrés`);
