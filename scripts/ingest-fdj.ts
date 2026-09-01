/**
 * Télécharge les archives officielles FDJ, décompresse, normalise et écrit
 * un JSON par jeu dans /data. Idempotent : relance quand tu veux.
 *
 *   npm run ingest:fdj
 *   npm run ingest:fdj -- loto euromillions
 */
import "./load-env.js";
import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import path from "node:path";
import iconv from "iconv-lite";
import unzipper from "unzipper";
import { GAMES, type GameId } from "../src/lib/fdj/games.js";
import { parseFdjCsv } from "../src/lib/fdj/parse.js";
import type { Draw, GameDataset } from "../src/lib/fdj/types.js";

const OUT = path.join(process.cwd(), "data");

async function fetchArchive(url: string): Promise<Draw[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/zip,*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const dir = await unzipper.Open.buffer(buf);
  const out: Draw[] = [];
  for (const file of dir.files) {
    if (!/\.csv$/i.test(file.path)) continue;
    const raw = await file.buffer();
    // FDJ publie en Windows-1252 ; on tente UTF-8 puis on retombe dessus.
    const text = raw.includes(0xef) ? raw.toString("utf8") : iconv.decode(raw, "win1252");
    out.push(...parseFdjCsv(text));
  }
  return out;
}

async function ingest(id: GameId) {
  const game = GAMES[id];
  const seen = new Map<string, Draw>();

  for (const url of game.archives) {
    try {
      const draws = await fetchArchive(url);
      for (const d of draws) seen.set(`${d.date}|${d.main.join("-")}`, d);
      console.log(`  · ${draws.length.toString().padStart(5)} tirages — ${url.slice(-6)}`);
    } catch (err) {
      console.warn(`  ! archive ignorée (${url.slice(-6)}) :`, (err as Error).message);
    }
  }

  const draws = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));
  if (!draws.length) {
    console.warn(`  ! aucun tirage pour ${id}, fichier non écrit`);
    return;
  }

  const dataset: GameDataset = {
    game: id,
    updatedAt: new Date().toISOString(),
    count: draws.length,
    from: draws[draws.length - 1].date,
    to: draws[0].date,
    draws,
  };
  await writeFile(path.join(OUT, `${id}.json`), JSON.stringify(dataset), "utf8");
  console.log(`  = ${draws.length} tirages, ${dataset.from} → ${dataset.to}\n`);
}

const targets = (process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(GAMES)) as GameId[];

await mkdir(OUT, { recursive: true });
for (const id of targets) {
  if (!GAMES[id]) {
    console.warn(`Jeu inconnu : ${id}`);
    continue;
  }
  console.log(`${GAMES[id].label}`);
  await ingest(id);
}
