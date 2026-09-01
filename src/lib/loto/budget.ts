export interface BudgetEntry {
  date: string;
  game: string;
  stake: number;
  won: number;
}

export interface BudgetSummary {
  staked: number;
  won: number;
  net: number;
  /** Retour réel constaté, à comparer au TRJ annoncé */
  realTrj: number;
  entries: number;
  /** Projection de la perte sur 12 mois au rythme actuel */
  yearlyProjection: number;
  /** Reste disponible sur le plafond mensuel */
  remaining: number;
  overCap: boolean;
}

export function summarise(entries: BudgetEntry[], monthlyCap: number): BudgetSummary {
  const staked = entries.reduce((a, e) => a + e.stake, 0);
  const won = entries.reduce((a, e) => a + e.won, 0);

  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = entries
    .filter((e) => e.date.startsWith(month))
    .reduce((a, e) => a + e.stake, 0);

  const days = spanInDays(entries) || 1;

  return {
    staked,
    won,
    net: won - staked,
    realTrj: staked > 0 ? won / staked : 0,
    entries: entries.length,
    yearlyProjection: ((won - staked) / days) * 365,
    remaining: monthlyCap - thisMonth,
    overCap: thisMonth > monthlyCap,
  };
}

function spanInDays(entries: BudgetEntry[]): number {
  if (entries.length < 2) return 0;
  const dates = entries.map((e) => Date.parse(e.date)).sort((a, b) => a - b);
  return Math.max(1, (dates[dates.length - 1] - dates[0]) / 86_400_000);
}
