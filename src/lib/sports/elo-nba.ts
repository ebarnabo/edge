/**
 * Elo NBA avec multiplicateur d'écart de points (marge de victoire) et
 * correction de l'auto-corrélation du favori, façon FiveThirtyEight.
 * Le total de points est estimé par un modèle rythme × efficacité.
 */

export interface Game {
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

export interface TeamState {
  team: string;
  elo: number;
  games: number;
  pointsFor: number;
  pointsAgainst: number;
  lastPlayed: string | null;
}

const START = 1500;
const K = 20;
const HOME_EDGE = 65;
const REGRESSION = 0.25; // retour vers 1500 entre deux saisons

export function rate(games: Game[], opts: { k?: number; homeEdge?: number } = {}) {
  const { k = K, homeEdge = HOME_EDGE } = opts;
  const state = new Map<string, TeamState>();

  const get = (team: string): TeamState => {
    let s = state.get(team);
    if (!s) {
      s = { team, elo: START, games: 0, pointsFor: 0, pointsAgainst: 0, lastPlayed: null };
      state.set(team, s);
    }
    return s;
  };

  const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date));
  let season = ordered[0]?.date.slice(0, 4);

  for (const g of ordered) {
    const year = g.date.slice(0, 4);
    if (year !== season && Number(g.date.slice(5, 7)) >= 10) {
      for (const s of state.values()) s.elo = START + (s.elo - START) * (1 - REGRESSION);
      season = year;
    }

    const h = get(g.home);
    const a = get(g.away);

    const diff = h.elo + homeEdge - a.elo;
    const expected = 1 / (1 + 10 ** (-diff / 400));
    const actual = g.homeScore > g.awayScore ? 1 : 0;

    const margin = Math.abs(g.homeScore - g.awayScore);
    const winnerDiff = actual === 1 ? diff : -diff;
    const mov = ((margin + 3) ** 0.8) / (7.5 + 0.006 * winnerDiff);

    const delta = k * mov * (actual - expected);
    h.elo += delta;
    a.elo -= delta;

    h.games++;
    a.games++;
    h.pointsFor += g.homeScore;
    h.pointsAgainst += g.awayScore;
    a.pointsFor += g.awayScore;
    a.pointsAgainst += g.homeScore;
    h.lastPlayed = g.date;
    a.lastPlayed = g.date;
  }

  return state;
}

export interface NbaForecast {
  home: string;
  away: string;
  homeWin: number;
  awayWin: number;
  /** Écart attendu, positif = avantage domicile */
  spread: number;
  total: number;
  eloDiff: number;
  restEdge: number;
}

/** ~28 points d'Elo par point d'écart : rapport empirique sur la ligue. */
const ELO_PER_POINT = 28;

export function project(
  state: Map<string, TeamState>,
  home: string,
  away: string,
  ctx: { date?: string; homeEdge?: number } = {},
): NbaForecast | null {
  const h = state.get(home);
  const a = state.get(away);
  if (!h || !a) return null;

  const restEdge = restAdjustment(h, ctx.date) - restAdjustment(a, ctx.date);
  const diff = h.elo + (ctx.homeEdge ?? HOME_EDGE) - a.elo + restEdge;
  const homeWin = 1 / (1 + 10 ** (-diff / 400));

  const hPace = h.games ? (h.pointsFor + h.pointsAgainst) / h.games : 225;
  const aPace = a.games ? (a.pointsFor + a.pointsAgainst) / a.games : 225;

  return {
    home,
    away,
    homeWin,
    awayWin: 1 - homeWin,
    spread: diff / ELO_PER_POINT,
    total: (hPace + aPace) / 2,
    eloDiff: h.elo - a.elo,
    restEdge,
  };
}

/** Back-to-back : environ -45 points d'Elo, documenté sur les données de ligue. */
function restAdjustment(s: TeamState, date?: string): number {
  if (!date || !s.lastPlayed) return 0;
  const days = (Date.parse(date) - Date.parse(s.lastPlayed)) / 86_400_000;
  if (days <= 1) return -45;
  if (days >= 3) return 15;
  return 0;
}
