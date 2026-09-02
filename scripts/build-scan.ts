#!/usr/bin/env tsx
/**
 * Pré-calcule les prédictions du scan et écrit data/scan-cache.json.
 * À lancer après ingest:fixtures + ingest:odds (ou build:models).
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildScanBase, scanCacheKey, type ScanCacheFile } from "../src/lib/sports/scan.js";

async function main() {
  console.log("[scan] calcul des prédictions…");
  const start = Date.now();
  const { rows, fixturesUpdatedAt, oddsUpdatedAt } = await buildScanBase();

  if (!fixturesUpdatedAt || !rows.length) {
    console.warn("[scan] aucun match — cache non écrit");
    process.exit(0);
  }

  const cache: ScanCacheFile = {
    key: scanCacheKey(fixturesUpdatedAt, oddsUpdatedAt ?? ""),
    fixturesUpdatedAt,
    oddsUpdatedAt: oddsUpdatedAt ?? "",
    rows,
  };

  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "scan-cache.json"), JSON.stringify(cache));

  console.log(`[scan] ${rows.length} matchs en ${((Date.now() - start) / 1000).toFixed(1)}s → data/scan-cache.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
