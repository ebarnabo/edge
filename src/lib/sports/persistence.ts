import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fit, type FittedModel, type Match } from "./dixon-coles";
import { FeatureEngine } from "./features";
import { buildPipeline, type Pipeline } from "./football-pipeline";
import { buildNbaPipeline, NbaEngine, type NbaPipeline } from "./nba-pipeline";
import type { Game } from "./elo-nba";

/**
 * Persistance des chaînes ajustées.
 *
 * Reconstruire une chaîne coûte une dizaine de secondes : validation par
 * origine glissante, réajustements successifs, ajustement final. On l'écrit
 * sur disque, indexée sur l'empreinte des données d'entrée — un nouvel import
 * change l'empreinte et déclenche automatiquement un réajustement.
 *
 * Les prédictions intermédiaires du backtest ne sont pas conservées : elles
 * pèsent lourd et n'ont servi qu'à choisir le mélange, déjà figé.
 */

const CACHE = path.join(process.cwd(), ".cache", "models");
const VERSION = 3; // à incrémenter dès qu'un modèle change de forme

/** Empreinte compacte et stable des données d'entrée. */
export function fingerprint(parts: (string | number)[]): string {
  const input = parts.join("|");
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 0x01000193);
    h2 = Math.imul(h2 + input.charCodeAt(i), 0x85ebca6b);
  }
  return `${VERSION}-${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

async function read<T>(file: string, key: string): Promise<T | null> {
  try {
    const raw = JSON.parse(await readFile(path.join(CACHE, file), "utf8"));
    return raw.key === key ? (raw.payload as T) : null;
  } catch {
    return null;
  }
}

async function write(file: string, key: string, payload: unknown) {
  await mkdir(CACHE, { recursive: true });
  await writeFile(path.join(CACHE, file), JSON.stringify({ key, payload }), "utf8");
}

// ------------------------------------------------------------- football

interface StoredFootball {
  dc: { ratings: [string, { attack: number; defence: number }][] } & Omit<FittedModel, "ratings">;
  logit: Pipeline["logit"];
  engine: ReturnType<FeatureEngine["toJSON"]>;
  validation: Omit<Pipeline["validation"], "predictions">;
  teams: string[];
  matches: number;
  lastDate: string;
}

function serialiseFootball(p: Pipeline): StoredFootball {
  const { predictions, ...validation } = p.validation;
  void predictions;
  return {
    dc: { ...p.dc, ratings: [...p.dc.ratings] },
    logit: p.logit,
    engine: p.engine.toJSON(),
    validation,
    teams: p.teams,
    matches: p.matches,
    lastDate: p.lastDate,
  };
}

function deserialiseFootball(s: StoredFootball): Pipeline {
  return {
    dc: { ...s.dc, ratings: new Map(s.dc.ratings) },
    logit: s.logit,
    engine: FeatureEngine.fromJSON(s.engine),
    validation: { ...s.validation, predictions: [] },
    teams: s.teams,
    matches: s.matches,
    lastDate: s.lastDate,
  };
}

export async function loadOrBuildFootball(
  code: string,
  matches: Match[],
  updatedAt: string,
): Promise<{ pipeline: Pipeline; fromCache: boolean }> {
  const key = fingerprint([code, updatedAt, matches.length, matches.at(-1)?.date ?? ""]);
  const file = `football-${code}.json`;

  const cached = await read<StoredFootball>(file, key);
  if (cached) return { pipeline: deserialiseFootball(cached), fromCache: true };

  const pipeline = buildPipeline(matches);
  await write(file, key, serialiseFootball(pipeline));
  return { pipeline, fromCache: false };
}

// ------------------------------------------------------------------ NBA

interface StoredNba extends Omit<NbaPipeline, "engine"> {
  engine: ReturnType<NbaEngine["toJSON"]>;
}

export async function loadOrBuildNba(
  games: Game[],
  updatedAt: string,
): Promise<{ pipeline: NbaPipeline; fromCache: boolean }> {
  const key = fingerprint(["nba", updatedAt, games.length, games.at(-1)?.date ?? ""]);
  const file = "nba.json";

  const cached = await read<StoredNba>(file, key);
  if (cached) {
    return {
      pipeline: { ...cached, engine: NbaEngine.fromJSON(cached.engine) },
      fromCache: true,
    };
  }

  const pipeline = buildNbaPipeline(games);
  await write(file, key, { ...pipeline, engine: pipeline.engine.toJSON() });
  return { pipeline, fromCache: false };
}

/** Réajustement rapide de Dixon–Coles seul, utile pour un test isolé. */
export const refit = (matches: Match[]) => fit(matches, { iterations: 900 });
