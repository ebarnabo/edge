import type { Pipeline } from "./football-pipeline";
import type { NbaPipeline } from "./nba-pipeline";
import { loadOrBuildFootball, loadOrBuildNba } from "./persistence";
import { loadFootball, loadNba, availableCompetitions } from "@/lib/data";

/**
 * Les chaînes complètes coûtent plusieurs secondes : validation par origine
 * glissante, réajustements successifs, ajustement final. On les garde en
 * mémoire du processus, indexées sur la date de mise à jour des données —
 * un nouvel import invalide automatiquement l'entrée.
 */
const cache = new Map<string, Promise<unknown>>();

function memo<T>(key: string, build: () => Promise<T>): Promise<T> {
  let hit = cache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = build().catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, hit);
  }
  return hit;
}

export interface PipelineState<T> {
  pipeline: T | null;
  error: string | null;
}

export async function footballPipeline(code: string): Promise<PipelineState<Pipeline>> {
  const data = await loadFootball(code);
  if (!data?.matches.length) return { pipeline: null, error: null };

  try {
    const pipeline = await memo(`football:${code}:${data.updatedAt}`, async () => {
      const { pipeline, fromCache } = await loadOrBuildFootball(code, data.matches, data.updatedAt);
      if (!fromCache) console.log(`[edge] chaîne ${code} ajustée et mise en cache`);
      return pipeline;
    });
    return { pipeline, error: null };
  } catch (err) {
    return { pipeline: null, error: (err as Error).message };
  }
}

export async function nbaPipeline(): Promise<PipelineState<NbaPipeline>> {
  const data = await loadNba();
  if (!data?.games.length) return { pipeline: null, error: null };

  try {
    const pipeline = await memo(`nba:${data.updatedAt}`, async () => {
      const { pipeline, fromCache } = await loadOrBuildNba(data.games, data.updatedAt);
      if (!fromCache) console.log("[edge] chaîne NBA ajustée et mise en cache");
      return pipeline;
    });
    return { pipeline, error: null };
  } catch (err) {
    return { pipeline: null, error: (err as Error).message };
  }
}

export const competitions = availableCompetitions;
