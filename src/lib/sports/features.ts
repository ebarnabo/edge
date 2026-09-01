import type { Match } from "./dixon-coles";
import { FootballElo } from "./elo-football";

/**
 * Extraction de variables explicatives strictement causales : à chaque match,
 * seules les rencontres antérieures sont lues. C'est ce qui rend le backtest
 * honnête — aucune information future ne fuit dans l'entraînement.
 */

export const FEATURE_NAMES = [
  "eloDiff",
  "formDiff",
  "attackDiff",
  "defenceDiff",
  "h2hDiff",
  "restDiff",
  "congestionDiff",
  "streakDiff",
  "venueFormDiff",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export type Outcome = 0 | 1 | 2; // 0 = domicile, 1 = nul, 2 = extérieur

export interface Row {
  date: string;
  home: string;
  away: string;
  x: number[];
  y: Outcome;
  goals: [number, number];
}

interface TeamLog {
  date: string;
  opponent: string;
  home: boolean;
  scored: number;
  conceded: number;
  points: number;
}

const DECAY = 0.82; // poids d'un match sur le précédent dans la forme

function weightedMean(values: number[], decay = DECAY): number {
  if (!values.length) return 0;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    const w = decay ** i; // index 0 = plus récent
    num += w * v;
    den += w;
  });
  return num / den;
}

export class FeatureEngine {
  private logs = new Map<string, TeamLog[]>();
  private h2h = new Map<string, { date: string; home: string; hg: number; ag: number }[]>();
  readonly elo: FootballElo;

  constructor(opts: { elo?: FootballElo } = {}) {
    this.elo = opts.elo ?? new FootballElo();
  }

  private log(team: string): TeamLog[] {
    let l = this.logs.get(team);
    if (!l) {
      l = [];
      this.logs.set(team, l);
    }
    return l;
  }

  private pairKey(a: string, b: string) {
    return [a, b].sort().join("::");
  }

  /** Nombre de matchs déjà enregistrés pour l'équipe. */
  played(team: string): number {
    return this.logs.get(team)?.length ?? 0;
  }

  extract(home: string, away: string, date: string): number[] {
    const hLog = this.log(home);
    const aLog = this.log(away);

    const form = (log: TeamLog[]) => weightedMean(log.slice(0, 10).map((m) => m.points));
    const scored = (log: TeamLog[]) => weightedMean(log.slice(0, 10).map((m) => m.scored));
    const conceded = (log: TeamLog[]) => weightedMean(log.slice(0, 10).map((m) => m.conceded));
    const venueForm = (log: TeamLog[], atHome: boolean) =>
      weightedMean(log.filter((m) => m.home === atHome).slice(0, 6).map((m) => m.points));

    const rest = (log: TeamLog[]) => {
      if (!log.length) return 7;
      const days = (Date.parse(date) - Date.parse(log[0].date)) / 86_400_000;
      return Math.max(0, Math.min(14, days));
    };

    const congestion = (log: TeamLog[]) =>
      log.filter((m) => (Date.parse(date) - Date.parse(m.date)) / 86_400_000 <= 14).length;

    const streak = (log: TeamLog[]) => {
      let s = 0;
      for (const m of log) {
        if (m.points >= 1) s++;
        else break;
      }
      return Math.min(8, s);
    };

    const meetings = (this.h2h.get(this.pairKey(home, away)) ?? []).slice(0, 6);
    const h2hScore = weightedMean(
      meetings.map((m) => {
        const homeSide = m.home === home;
        const diff = homeSide ? m.hg - m.ag : m.ag - m.hg;
        return Math.max(-2, Math.min(2, diff));
      }),
      0.75,
    );

    return [
      this.elo.diff(home, away) / 100,
      form(hLog) - form(aLog),
      scored(hLog) - scored(aLog),
      conceded(aLog) - conceded(hLog),
      h2hScore,
      (rest(hLog) - rest(aLog)) / 7,
      (congestion(aLog) - congestion(hLog)) / 2,
      (streak(hLog) - streak(aLog)) / 4,
      venueForm(hLog, true) - venueForm(aLog, false),
    ];
  }

  push(m: Match) {
    const points = (a: number, b: number) => (a > b ? 3 : a === b ? 1 : 0);

    this.log(m.home).unshift({
      date: m.date,
      opponent: m.away,
      home: true,
      scored: m.homeGoals,
      conceded: m.awayGoals,
      points: points(m.homeGoals, m.awayGoals),
    });
    this.log(m.away).unshift({
      date: m.date,
      opponent: m.home,
      home: false,
      scored: m.awayGoals,
      conceded: m.homeGoals,
      points: points(m.awayGoals, m.homeGoals),
    });

    const key = this.pairKey(m.home, m.away);
    const list = this.h2h.get(key) ?? [];
    list.unshift({ date: m.date, home: m.home, hg: m.homeGoals, ag: m.awayGoals });
    this.h2h.set(key, list);

    this.elo.update(m.date, m.home, m.away, m.homeGoals, m.awayGoals);
  }

  toJSON() {
    return {
      logs: [...this.logs],
      h2h: [...this.h2h],
      elo: this.elo.toJSON(),
    };
  }

  static fromJSON(raw: ReturnType<FeatureEngine["toJSON"]>): FeatureEngine {
    const engine = new FeatureEngine({ elo: FootballElo.fromJSON(raw.elo) });
    for (const [team, log] of raw.logs) engine.logs.set(team, log);
    for (const [key, meetings] of raw.h2h) engine.h2h.set(key, meetings);
    return engine;
  }
}

export function outcomeOf(m: Match): Outcome {
  return m.homeGoals > m.awayGoals ? 0 : m.homeGoals === m.awayGoals ? 1 : 2;
}

/**
 * Construit la matrice d'apprentissage en un passage chronologique.
 * `warmup` écarte les premiers matchs, où les équipes n'ont pas d'historique.
 */
export function buildRows(matches: Match[], warmup = 6): { rows: Row[]; engine: FeatureEngine } {
  const engine = new FeatureEngine();
  const ordered = [...matches].sort((a, b) => a.date.localeCompare(b.date));
  const rows: Row[] = [];

  for (const m of ordered) {
    if (engine.played(m.home) >= warmup && engine.played(m.away) >= warmup) {
      rows.push({
        date: m.date,
        home: m.home,
        away: m.away,
        x: engine.extract(m.home, m.away, m.date),
        y: outcomeOf(m),
        goals: [m.homeGoals, m.awayGoals],
      });
    }
    engine.push(m);
  }

  return { rows, engine };
}
