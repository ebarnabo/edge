/**
 * Pré-calcule les modèles sport et les écrit dans data/models/.
 * Appelé par le workflow GitHub Actions après chaque import de résultats.
 */
import "./load-env.js";
import { availableCompetitions, loadFootball, loadNba } from "../src/lib/data.js";
import { loadOrBuildFootball, loadOrBuildNba } from "../src/lib/sports/persistence.js";

process.env.EDGE_ALLOW_MODEL_BUILD = "true";

const codes = await availableCompetitions();
let built = 0;

for (const code of codes) {
  const data = await loadFootball(code);
  if (!data?.matches.length) continue;
  console.log(`Football ${code} (${data.matches.length} matchs)…`);
  const { fromCache } = await loadOrBuildFootball(code, data.matches, data.updatedAt);
  console.log(fromCache ? "  · depuis le cache" : "  · ajusté");
  built++;
}

const nba = await loadNba();
if (nba?.games.length) {
  console.log(`NBA (${nba.games.length} matchs)…`);
  const { fromCache } = await loadOrBuildNba(nba.games, nba.updatedAt);
  console.log(fromCache ? "  · depuis le cache" : "  · ajusté");
  built++;
}

if (!built) {
  console.warn("Aucune donnée sport — modèles non générés.");
  process.exit(0);
}

console.log(`= ${built} modèle(s) prêt(s) dans data/models/`);
