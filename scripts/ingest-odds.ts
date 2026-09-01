/**
 * Cotes multi-bookmakers depuis The Odds API.
 *   npm run ingest:odds
 *
 * Palier gratuit limité : chaque compétition et chaque région consomment une
 * requête. Le script n'appelle que les compétitions présentes dans /data.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MarketEvent } from "../src/lib/sports/odds.js";
import { availableCompetitions } from "../src/lib/data.js";

const KEY = process.env.ODDS_API_KEY;
const REGIONS = process.env.ODDS_REGIONS ?? "eu,uk";
const BASE = "https://api.the-odds-api.com/v4/sports";

/** Correspondance entre codes football-data et clés The Odds API. */
const SPORT_KEYS: Record<string, string> = {
  FL1: "soccer_france_ligue_one",
  PL: "soccer_epl",
  PD: "soccer_spain_la_liga",
  SA: "soccer_italy_serie_a",
  BL1: "soccer_germany_bundesliga",
  DED: "soccer_netherlands_eredivisie",
  PPL: "soccer_portugal_primeira_liga",
  CL: "soccer_uefa_champs_league",
  NBA: "basketball_nba",
};

interface ApiEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    last_update: string;
    markets: { key: string; outcomes: { name: string; price: number }[] }[];
  }[];
}

async function fetchSport(code: string, sportKey: string): Promise<MarketEvent[]> {
  const url = new URL(`${BASE}/${sportKey}/odds`);
  url.searchParams.set("apiKey", KEY!);
  url.searchParams.set("regions", REGIONS);
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");

  const res = await fetch(url);
  if (res.status === 401) throw new Error("Clé refusée");
  if (res.status === 429) throw new Error("Quota épuisé");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const remaining = res.headers.get("x-requests-remaining");
  if (remaining) console.log(`    (${remaining} requêtes restantes ce mois-ci)`);

  const json = (await res.json()) as ApiEvent[];
  const sport = sportKey.startsWith("basketball") ? "nba" : "football";

  return json.map((e) => {
    // L'ordre des issues varie d'un opérateur à l'autre : on le fige ici.
    const order =
      sport === "football" ? [e.home_team, "Draw", e.away_team] : [e.home_team, e.away_team];

    return {
      id: e.id,
      sport: sport as "football" | "nba",
      competition: code,
      commenceTime: e.commence_time,
      home: e.home_team,
      away: e.away_team,
      outcomes: sport === "football" ? [e.home_team, "Match nul", e.away_team] : order,
      books: e.bookmakers
        .map((b) => {
          const market = b.markets.find((m) => m.key === "h2h");
          if (!market) return null;
          const prices = order.map(
            (label) => market.outcomes.find((o) => o.name === label)?.price ?? 0,
          );
          return prices.every((p) => p > 1)
            ? { bookmaker: b.key, prices, updatedAt: b.last_update }
            : null;
        })
        .filter((b): b is NonNullable<typeof b> => b !== null),
    };
  });
}

if (!KEY) {
  console.error("ODDS_API_KEY manquant. Voir .env.example");
  process.exit(1);
}

const requested = process.argv.slice(2);
const codes = requested.length
  ? requested
  : [...(await availableCompetitions()), "NBA"].filter((c) => SPORT_KEYS[c]);

const events: MarketEvent[] = [];
console.log("Cotes multi-bookmakers");

for (const code of codes) {
  const key = SPORT_KEYS[code];
  if (!key) {
    console.warn(`  ! pas de correspondance pour ${code}`);
    continue;
  }
  try {
    const batch = await fetchSport(code, key);
    events.push(...batch);
    const books = new Set(batch.flatMap((e) => e.books.map((b) => b.bookmaker)));
    console.log(`  · ${batch.length} événements, ${books.size} opérateurs — ${code}`);
  } catch (err) {
    console.warn(`  ! ${code} : ${(err as Error).message}`);
  }
}

await mkdir(path.join(process.cwd(), "data"), { recursive: true });
await writeFile(
  path.join(process.cwd(), "data", "odds.json"),
  JSON.stringify({ updatedAt: new Date().toISOString(), events }),
  "utf8",
);
console.log(`= ${events.length} événements cotés`);
