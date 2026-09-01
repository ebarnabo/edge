/**
 * Modèle de Dixon–Coles (1997) pour le football.
 *
 * λ = exp(attaque_dom + défense_ext + avantage_terrain)
 * μ = exp(attaque_ext + défense_dom)
 *
 * Vraisemblance pondérée par une décroissance temporelle exp(-ξ·jours),
 * plus la correction τ sur les scores faibles (0-0, 1-0, 0-1, 1-1) qui
 * corrige la sous-estimation des matchs serrés par un Poisson simple.
 */

export interface Match {
  date: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

export interface TeamRating {
  team: string;
  attack: number;
  defence: number;
  /** buts marqués attendus à domicile contre une équipe moyenne */
  expectedFor: number;
}

export interface FittedModel {
  ratings: Map<string, { attack: number; defence: number }>;
  homeAdvantage: number;
  rho: number;
  matches: number;
  logLikelihood: number;
}

const MAX_GOALS = 10;

function tau(x: number, y: number, l: number, m: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - l * m * rho;
  if (x === 0 && y === 1) return 1 + l * rho;
  if (x === 1 && y === 0) return 1 + m * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

export function fit(
  matches: Match[],
  opts: { xi?: number; iterations?: number; learningRate?: number } = {},
): FittedModel {
  const { xi = 0.0018, iterations = 600, learningRate = 0.02 } = opts;
  const teams = [...new Set(matches.flatMap((m) => [m.home, m.away]))].sort();
  const index = new Map(teams.map((t, i) => [t, i]));

  const latest = Math.max(...matches.map((m) => Date.parse(m.date)));
  const weights = matches.map((m) =>
    Math.exp((-xi * (latest - Date.parse(m.date))) / 86_400_000),
  );

  const attack = new Float64Array(teams.length);
  const defence = new Float64Array(teams.length);
  let home = 0.25;

  for (let it = 0; it < iterations; it++) {
    const gA = new Float64Array(teams.length);
    const gD = new Float64Array(teams.length);
    let gH = 0;

    matches.forEach((m, k) => {
      const h = index.get(m.home)!;
      const a = index.get(m.away)!;
      const w = weights[k];
      const l = Math.exp(attack[h] + defence[a] + home);
      const mu = Math.exp(attack[a] + defence[h]);
      const rH = w * (m.homeGoals - l);
      const rA = w * (m.awayGoals - mu);

      gA[h] += rH;
      gA[a] += rA;
      gD[a] += rH;
      gD[h] += rA;
      gH += rH;
    });

    const norm = matches.length;
    for (let i = 0; i < teams.length; i++) {
      attack[i] += (learningRate * gA[i]) / norm;
      defence[i] += (learningRate * gD[i]) / norm;
    }
    home += (learningRate * gH) / norm;

    // Identifiabilité : moyenne des attaques nulle.
    const meanA = attack.reduce((a, b) => a + b, 0) / teams.length;
    for (let i = 0; i < teams.length; i++) attack[i] -= meanA;
  }

  const rho = fitRho(matches, weights, teams, index, attack, defence, home);

  let ll = 0;
  matches.forEach((m, k) => {
    const h = index.get(m.home)!;
    const a = index.get(m.away)!;
    const l = Math.exp(attack[h] + defence[a] + home);
    const mu = Math.exp(attack[a] + defence[h]);
    ll +=
      weights[k] *
      (Math.log(Math.max(1e-12, tau(m.homeGoals, m.awayGoals, l, mu, rho))) +
        m.homeGoals * Math.log(l) -
        l +
        m.awayGoals * Math.log(mu) -
        mu);
  });

  return {
    ratings: new Map(
      teams.map((t, i) => [t, { attack: attack[i], defence: defence[i] }]),
    ),
    homeAdvantage: home,
    rho,
    matches: matches.length,
    logLikelihood: ll,
  };
}

/** ρ est estimé seul, par balayage, une fois les forces d'équipe fixées. */
function fitRho(
  matches: Match[],
  weights: number[],
  teams: string[],
  index: Map<string, number>,
  attack: Float64Array,
  defence: Float64Array,
  home: number,
): number {
  let best = 0;
  let bestLl = -Infinity;
  for (let rho = -0.2; rho <= 0.2; rho += 0.005) {
    let ll = 0;
    let valid = true;
    matches.forEach((m, k) => {
      if (!valid) return;
      const l = Math.exp(attack[index.get(m.home)!] + defence[index.get(m.away)!] + home);
      const mu = Math.exp(attack[index.get(m.away)!] + defence[index.get(m.home)!]);
      const t = tau(m.homeGoals, m.awayGoals, l, mu, rho);
      if (t <= 0) {
        valid = false;
        return;
      }
      ll += weights[k] * Math.log(t);
    });
    if (valid && ll > bestLl) {
      bestLl = ll;
      best = rho;
    }
  }
  return best;
}

export interface MatchForecast {
  home: string;
  away: string;
  lambda: number;
  mu: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  bttsYes: number;
  over25: number;
  under25: number;
  /** Scores exacts les plus probables */
  topScores: { score: string; p: number }[];
}

export function forecast(model: FittedModel, home: string, away: string): MatchForecast | null {
  const h = model.ratings.get(home);
  const a = model.ratings.get(away);
  if (!h || !a) return null;

  const lambda = Math.exp(h.attack + a.defence + model.homeAdvantage);
  const mu = Math.exp(a.attack + h.defence);

  const pois = (k: number, m: number) =>
    (Math.exp(-m) * m ** k) / factorial(k);

  const grid: number[][] = [];
  let total = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    grid[x] = [];
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = tau(x, y, lambda, mu, model.rho) * pois(x, lambda) * pois(y, mu);
      grid[x][y] = p;
      total += p;
    }
  }

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let btts = 0;
  let over25 = 0;
  const scores: { score: string; p: number }[] = [];

  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = grid[x][y] / total;
      if (x > y) homeWin += p;
      else if (x === y) draw += p;
      else awayWin += p;
      if (x > 0 && y > 0) btts += p;
      if (x + y > 2.5) over25 += p;
      scores.push({ score: `${x}-${y}`, p });
    }
  }

  return {
    home,
    away,
    lambda,
    mu,
    homeWin,
    draw,
    awayWin,
    bttsYes: btts,
    over25,
    under25: 1 - over25,
    topScores: scores.sort((a, b) => b.p - a.p).slice(0, 5),
  };
}

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];
const factorial = (k: number) => FACT[k] ?? Infinity;
