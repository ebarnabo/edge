/**
 * Elo football façon ClubElo : facteur K modulé par l'écart de buts.
 * Sert de variable explicative au modèle discriminant et de courbe de tendance
 * lisible pour l'utilisateur.
 */

export interface EloOptions {
  k?: number;
  homeAdvantage?: number;
  start?: number;
}

export class FootballElo {
  private ratings = new Map<string, number>();
  readonly history: { date: string; team: string; elo: number }[] = [];

  constructor(readonly opts: EloOptions = {}) {}

  private get k() {
    return this.opts.k ?? 20;
  }
  private get homeAdvantage() {
    return this.opts.homeAdvantage ?? 65;
  }
  private get start() {
    return this.opts.start ?? 1500;
  }

  get(team: string): number {
    return this.ratings.get(team) ?? this.start;
  }

  /** Différence de force vue du domicile, avantage du terrain inclus. */
  diff(home: string, away: string): number {
    return this.get(home) + this.homeAdvantage - this.get(away);
  }

  expected(home: string, away: string): number {
    return 1 / (1 + 10 ** (-this.diff(home, away) / 400));
  }

  update(date: string, home: string, away: string, hg: number, ag: number) {
    const we = this.expected(home, away);
    const w = hg > ag ? 1 : hg === ag ? 0.5 : 0;

    // Un 4-0 informe davantage qu'un 1-0 : le gain d'Elo croît avec l'écart.
    const gd = Math.abs(hg - ag);
    const g = gd <= 1 ? 1 : gd === 2 ? 1.5 : (11 + gd) / 8;

    const delta = this.k * g * (w - we);
    this.ratings.set(home, this.get(home) + delta);
    this.ratings.set(away, this.get(away) - delta);

    this.history.push({ date, team: home, elo: this.get(home) });
    this.history.push({ date, team: away, elo: this.get(away) });
  }

  /** Ramène les forces vers la moyenne entre deux saisons. */
  regress(factor = 0.2) {
    for (const [team, elo] of this.ratings) {
      this.ratings.set(team, this.start + (elo - this.start) * (1 - factor));
    }
  }

  table() {
    return [...this.ratings.entries()]
      .map(([team, elo]) => ({ team, elo }))
      .sort((a, b) => b.elo - a.elo);
  }

  snapshot(): Map<string, number> {
    return new Map(this.ratings);
  }

  toJSON() {
    return { ratings: [...this.ratings], history: this.history, opts: this.opts };
  }

  static fromJSON(raw: ReturnType<FootballElo["toJSON"]>): FootballElo {
    const elo = new FootballElo(raw.opts);
    for (const [team, rating] of raw.ratings) elo.ratings.set(team, rating);
    elo.history.push(...raw.history);
    return elo;
  }
}
