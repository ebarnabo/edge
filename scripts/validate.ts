/**
 * Rapport de validation en ligne de commande, sans lancer l'application.
 *
 *   npm run validate                 # toutes les données présentes
 *   npm run validate -- loto FL1
 *
 * Utile pour vérifier après chaque import que les modèles battent encore
 * les fréquences de base, et de combien.
 */
import { GAMES, type GameId } from "../src/lib/fdj/games.js";
import { loadDraws, loadFootball, loadNba, availableCompetitions } from "../src/lib/data.js";
import {
  gapLaw,
  serialIndependence,
  strategyBacktest,
  sumDistribution,
} from "../src/lib/loto/diagnostics.js";
import { buildPipeline } from "../src/lib/sports/football-pipeline.js";
import { buildNbaPipeline } from "../src/lib/sports/nba-pipeline.js";

const targets = process.argv.slice(2);
const wanted = (name: string) => targets.length === 0 || targets.includes(name);

for (const id of Object.keys(GAMES) as GameId[]) {
  if (!wanted(id)) continue;
  const data = await loadDraws(id);
  if (!data) continue;

  const game = GAMES[id];
  console.log(`\n=== ${game.label} — ${data.count} tirages (${data.from} → ${data.to}) ===`);

  for (const t of [serialIndependence(data.draws, game), gapLaw(data.draws, game), sumDistribution(data.draws, game).test]) {
    console.log(`  ${t.passed ? "·" : "!"} ${t.name.padEnd(44)} p = ${t.pValue.toFixed(3)}`);
  }

  const bt = strategyBacktest(data.draws, game);
  console.log(`  Backtest sur ${bt.sampled} tirages — théorique ${bt.theoretical.toFixed(4)} ± ${bt.standardError.toFixed(4)}`);
  console.table(
    bt.strategies.map((s) => ({
      stratégie: s.label,
      moyenne: s.meanMatches.toFixed(4),
      écart: `${s.z > 0 ? "+" : ""}${s.z.toFixed(2)} σ`,
      verdict: Math.abs(s.z) < 2 ? "conforme au hasard" : "à examiner",
    })),
  );
}

for (const code of await availableCompetitions()) {
  if (!wanted(code)) continue;
  const data = await loadFootball(code);
  if (!data?.matches.length) continue;

  console.log(`\n=== Football ${code} — ${data.matches.length} matchs ===`);
  try {
    const v = buildPipeline(data.matches).validation;
    console.log(`  Mélange ${v.blendConfig.weights.map((w) => `${(w * 100).toFixed(0)} %`).join(" / ")}, température ${v.blendConfig.temperature.toFixed(2)} — ${v.holdout} matchs réservés`);
    console.table(
      [v.baselineReport, ...v.reports].map((r) => ({
        modèle: r.name,
        logPerte: r.logLoss.toFixed(4),
        RPS: r.rps.toFixed(4),
        exactitude: `${(r.accuracy * 100).toFixed(1)} %`,
        apport: `${r.skill > 0 ? "+" : ""}${r.skill.toFixed(2)} %`,
      })),
    );
  } catch (err) {
    console.log(`  ! ${(err as Error).message}`);
  }
}

if (wanted("nba")) {
  const data = await loadNba();
  if (data?.games.length) {
    console.log(`\n=== NBA — ${data.games.length} matchs ===`);
    try {
      const p = buildNbaPipeline(data.games);
      console.table(
        p.reports.map((r) => ({
          modèle: r.name,
          logPerte: r.logLoss.toFixed(4),
          Brier: r.brier.toFixed(4),
          exactitude: `${(r.accuracy * 100).toFixed(1)} %`,
          apport: `${r.skill > 0 ? "+" : ""}${r.skill.toFixed(2)} %`,
        })),
      );
    } catch (err) {
      console.log(`  ! ${(err as Error).message}`);
    }
  }
}
