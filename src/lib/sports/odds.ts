import { evaluate, type Selection, type ValuedSelection } from "./value";

/**
 * Agrégation multi-bookmakers.
 *
 * La bonne méthode n'est pas de moyenner les cotes puis de retirer la marge :
 * chaque opérateur a sa propre marge, souvent répartie de façon asymétrique.
 * On retire donc la marge chez CHACUN, puis on agrège les probabilités
 * équitables obtenues. La médiane sert de consensus — elle encaisse mieux
 * qu'une moyenne les cotes aberrantes ou périmées.
 *
 * Le pari, lui, se place au meilleur prix disponible : un avantage de 3 %
 * disparaît entièrement si l'on parie deux centièmes trop bas.
 */

export interface BookQuote {
  bookmaker: string;
  /** Cotes par issue, dans l'ordre du marché */
  prices: number[];
  updatedAt: string;
}

export interface MarketEvent {
  id: string;
  sport: "football" | "nba";
  competition: string;
  commenceTime: string;
  home: string;
  away: string;
  /** Libellés des issues : [dom, nul, ext] ou [dom, ext] */
  outcomes: string[];
  books: BookQuote[];
}

/** Bookmakers réputés les plus efficients : leur ligne sert de référence. */
const SHARP_BOOKS = ["pinnacle", "betfair_ex_eu", "matchbook", "smarkets"];

export interface AggregatedMarket {
  outcomes: {
    label: string;
    /** Meilleure cote disponible et l'opérateur qui la propose */
    best: number;
    bestBook: string;
    /** Probabilité équitable médiane, marge retirée chez chaque opérateur */
    consensus: number;
    /** Probabilité équitable du bookmaker de référence, s'il est présent */
    sharp: number | null;
    spread: number;
  }[];
  books: number;
  sharpBook: string | null;
  /** Marge moyenne du marché, tous opérateurs confondus */
  averageMargin: number;
  /** Gain de cote obtenu en prenant le meilleur prix plutôt que la médiane */
  bestPriceGain: number;
}

const median = (values: number[]): number => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Retrait de marge par la méthode de Shin, appliqué à un opérateur isolé. */
function devigOne(prices: number[]): number[] {
  const implied = prices.map((p) => 1 / p);
  const sum = implied.reduce((a, b) => a + b, 0);
  if (sum <= 1) return implied.map((p) => p / sum);

  let z = 0;
  const shin = (zz: number) =>
    implied.map((p) => (Math.sqrt(zz ** 2 + 4 * (1 - zz) * (p ** 2 / sum)) - zz) / (2 * (1 - zz)));

  for (let i = 0; i < 60; i++) {
    const total = shin(z).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) < 1e-10) break;
    z = Math.min(0.5, Math.max(0, z + (total - 1) * 0.5));
  }

  const probs = shin(z);
  const norm = probs.reduce((a, b) => a + b, 0);
  return probs.map((p) => p / norm);
}

export function aggregate(event: MarketEvent): AggregatedMarket | null {
  const valid = event.books.filter(
    (b) => b.prices.length === event.outcomes.length && b.prices.every((p) => p > 1),
  );
  if (!valid.length) return null;

  const fairByBook = valid.map((b) => devigOne(b.prices));
  const margins = valid.map((b) => b.prices.reduce((a, p) => a + 1 / p, 0) - 1);

  const sharpIndex = valid.findIndex((b) => SHARP_BOOKS.includes(b.bookmaker.toLowerCase()));

  const outcomes = event.outcomes.map((label, i) => {
    const prices = valid.map((b) => b.prices[i]);
    const bestIdx = prices.indexOf(Math.max(...prices));
    return {
      label,
      best: prices[bestIdx],
      bestBook: valid[bestIdx].bookmaker,
      consensus: median(fairByBook.map((f) => f[i])),
      sharp: sharpIndex >= 0 ? fairByBook[sharpIndex][i] : null,
      spread: Math.max(...prices) - Math.min(...prices),
    };
  });

  // Renormalisation : la médiane ne somme pas exactement à 1.
  const total = outcomes.reduce((a, o) => a + o.consensus, 0);
  for (const o of outcomes) o.consensus /= total;

  const medianPrices = event.outcomes.map((_, i) => median(valid.map((b) => b.prices[i])));
  const bestPriceGain =
    outcomes.reduce((a, o, i) => a + o.best / medianPrices[i], 0) / outcomes.length - 1;

  return {
    outcomes,
    books: valid.length,
    sharpBook: sharpIndex >= 0 ? valid[sharpIndex].bookmaker : null,
    averageMargin: margins.reduce((a, b) => a + b, 0) / margins.length,
    bestPriceGain,
  };
}

export interface ValuedOutcome extends ValuedSelection {
  bestBook: string;
  consensus: number;
  sharp: number | null;
  spread: number;
}

/**
 * Confronte les probabilités du modèle au consensus, puis chiffre la mise au
 * meilleur prix trouvé. L'écart se mesure contre le consensus ; le gain se
 * calcule sur la cote réellement accessible.
 */
export function valueAgainstMarket(
  market: AggregatedMarket,
  modelProbs: number[],
  opts: { bankroll: number; kellyFraction?: number; threshold?: number },
): ValuedOutcome[] {
  const selections: Selection[] = market.outcomes.map((o, i) => ({
    label: o.label,
    modelProb: modelProbs[i],
    odds: o.best,
  }));

  return evaluate(selections, opts).map((v, i) => {
    const o = market.outcomes[i];
    const reference = o.sharp ?? o.consensus;
    const edge = v.modelProb - reference;
    const threshold = opts.threshold ?? 0.03;

    return {
      ...v,
      fairProb: reference,
      edge,
      verdict: edge >= threshold && v.ev > 0 ? "value" : edge <= -threshold ? "éviter" : "neutre",
      stake: edge >= threshold && v.ev > 0 ? v.stake : 0,
      bestBook: o.bestBook,
      consensus: o.consensus,
      sharp: o.sharp,
      spread: o.spread,
    };
  });
}

// ------------------------------------------------- rapprochement des noms

/** Sigles et descriptifs génériques. « United », « City », « Real » et « Inter »
 *  restent : ce sont eux qui distinguent deux clubs d'une même ville. */
const STOPWORDS =
  /\b(fc|cf|ac|as|sc|ss|sv|us|afc|cd|rc|rcd|ogc|losc|sk|bk|if|club|calcio|stade|olympique|olympiqu|sporting|athletic|racing|association|football|societa|societe|de|do|du|des|the)\b/g;

export function normaliseTeam(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(1[89]\d{2}|20\d{2})\b/g, " ") // année de fondation
    .replace(STOPWORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deux jetons comptent pour un si l'un est le radical de l'autre : « rennais »
 * et « rennes » partagent quatre lettres et désignent le même club. Sans ce
 * rattrapage, un tiers des clubs français ne se rapprochent pas.
 */
function tokenScore(a: string, b: string): number {
  if (a === b) return 1;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (short.length >= 4 && long.startsWith(short)) return 0.95;

  let common = 0;
  while (common < short.length && short[common] === long[common]) common++;
  return common >= 4 ? 0.8 : 0;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = a.split(" ").filter(Boolean);
  const tb = b.split(" ").filter(Boolean);
  if (!ta.length || !tb.length) return 0;

  const score = (from: string[], to: string[]) =>
    from.reduce((acc, t) => acc + Math.max(0, ...to.map((u) => tokenScore(t, u))), 0);

  // Symétrique, et tolérant aux noms longs face aux noms courts.
  const matched = (score(ta, tb) + score(tb, ta)) / 2;
  return (2 * matched) / (ta.length + tb.length);
}

/**
 * Les fournisseurs n'écrivent pas les clubs de la même façon
 * (« Paris Saint-Germain FC » contre « Paris Saint Germain »).
 * On rapproche par recouvrement de mots, avec un seuil prudent.
 */
/**
 * Abréviations qu'aucune mesure de similarité ne peut résoudre : « LA » et
 * « Los Angeles » ne partagent aucune lettre exploitable. La table reste
 * courte et se complète à la main quand un fournisseur ajoute une graphie.
 */
export const TEAM_ALIASES: Record<string, string> = {
  la: "los angeles",
  ny: "new york",
  nyc: "new york",
  gs: "golden state",
  sa: "san antonio",
  okc: "oklahoma city",
  psg: "paris saint germain",
  om: "marseille",
  ol: "lyon",
  inter: "internazionale",
  man: "manchester",
  spurs: "tottenham hotspur",
  wolves: "wolverhampton wanderers",
};

function expandAliases(normalised: string): string {
  return normalised
    .split(" ")
    .map((token) => TEAM_ALIASES[token] ?? token)
    .join(" ");
}

export function matchTeam(
  name: string,
  candidates: string[],
  threshold = 0.6,
  margin = 0.12,
): string | null {
  const target = expandAliases(normaliseTeam(name));
  const scored = candidates
    .map((candidate) => ({
      name: candidate,
      score: similarity(target, expandAliases(normaliseTeam(candidate))),
    }))
    .sort((a, b) => b.score - a.score);

  const [best, runnerUp] = scored;
  if (!best || best.score < threshold) return null;

  // Deux clubs d'une même ville partagent leurs jetons de lieu. Le seuil seul
  // ne les sépare pas ; l'écart au second candidat, si. C'est de la liste des
  // équipes connues que vient la discrimination, pas de la chaîne isolée.
  if (runnerUp && best.score - runnerUp.score < margin && best.score < 0.999) return null;

  return best.name;
}
