import { NextResponse } from "next/server";
import { footballPipeline, nbaPipeline } from "@/lib/sports/models";
import { predictMatch } from "@/lib/sports/football-pipeline";
import { predictNba } from "@/lib/sports/nba-pipeline";
import { evaluate, overround, type Selection } from "@/lib/sports/value";

export async function POST(request: Request) {
  const { sport, competition, home, away, odds, bankroll = 100 } = await request.json();

  if (home === away) {
    return NextResponse.json({ error: "Sélectionne deux équipes différentes." }, { status: 400 });
  }

  if (sport === "football") {
    const { pipeline, error } = await footballPipeline(competition);
    if (!pipeline) {
      return NextResponse.json({ error: error ?? "Compétition non chargée" }, { status: 404 });
    }

    const f = predictMatch(pipeline, home, away);
    if (!f) return NextResponse.json({ error: "Équipe inconnue du modèle" }, { status: 404 });

    const selections: Selection[] = [
      { label: home, modelProb: f.probs.homeWin, odds: Number(odds?.home) || 0 },
      { label: "Match nul", modelProb: f.probs.draw, odds: Number(odds?.draw) || 0 },
      { label: away, modelProb: f.probs.awayWin, odds: Number(odds?.away) || 0 },
    ];
    const priced = selections.every((s) => s.odds > 1);

    return NextResponse.json({
      sport,
      probs: [f.probs.homeWin, f.probs.draw, f.probs.awayWin],
      byModel: f.byModel,
      drivers: f.drivers.slice(0, 6),
      confidence: f.confidence,
      goals: {
        lambda: f.goals.lambda,
        mu: f.goals.mu,
        over25: f.goals.over25,
        bttsYes: f.goals.bttsYes,
        topScores: f.goals.topScores,
      },
      value: priced ? evaluate(selections, { bankroll }) : null,
      margin: priced ? overround(selections) : null,
    });
  }

  if (sport === "nba") {
    const { pipeline, error } = await nbaPipeline();
    if (!pipeline) {
      return NextResponse.json({ error: error ?? "Données NBA absentes" }, { status: 404 });
    }

    const f = predictNba(pipeline, home, away);
    if (!f) return NextResponse.json({ error: "Équipe inconnue du modèle" }, { status: 404 });

    const selections: Selection[] = [
      { label: home, modelProb: f.homeWin, odds: Number(odds?.home) || 0 },
      { label: away, modelProb: f.awayWin, odds: Number(odds?.away) || 0 },
    ];
    const priced = selections.every((s) => s.odds > 1);

    return NextResponse.json({
      sport,
      probs: [f.homeWin, f.awayWin],
      byModel: f.byModel,
      drivers: f.drivers.slice(0, 6),
      confidence: f.confidence,
      nba: { spread: f.spread, total: f.total },
      value: priced ? evaluate(selections, { bankroll }) : null,
      margin: priced ? overround(selections) : null,
    });
  }

  return NextResponse.json({ error: "Sport non pris en charge" }, { status: 400 });
}
