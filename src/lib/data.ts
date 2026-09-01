import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { GameId } from "./fdj/games";
import type { GameDataset } from "./fdj/types";
import type { Match } from "./sports/dixon-coles";
import type { Game } from "./sports/elo-nba";
import type { MarketEvent } from "./sports/odds";

export interface Fixture {
  id: string;
  sport: "football" | "nba";
  competition: string;
  date: string;
  commenceTime: string;
  home: string;
  away: string;
}

const DIR = path.join(process.cwd(), "data");

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(DIR, file), "utf8")) as T;
  } catch {
    return null;
  }
}

export const loadDraws = (game: GameId) => readJson<GameDataset>(`${game}.json`);

export const loadFootball = (code: string) =>
  readJson<{ competition: string; updatedAt: string; matches: Match[] }>(`football-${code}.json`);

export const loadNba = () => readJson<{ updatedAt: string; games: Game[] }>("nba.json");

export const loadFixtures = () =>
  readJson<{ updatedAt: string; fixtures: Fixture[] }>("fixtures.json");

export const loadOdds = () =>
  readJson<{ updatedAt: string; events: MarketEvent[] }>("odds.json");

export async function availableCompetitions(): Promise<string[]> {
  try {
    const files = await readdir(DIR);
    return files
      .filter((f) => f.startsWith("football-"))
      .map((f) => f.replace("football-", "").replace(".json", ""));
  } catch {
    return [];
  }
}
