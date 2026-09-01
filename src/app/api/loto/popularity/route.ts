import { NextResponse } from "next/server";
import { GAMES, type GameId } from "@/lib/fdj/games";
import { generateGrids, scoreCombination } from "@/lib/loto/popularity";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const game = GAMES[body.game as GameId];
    if (!game) return NextResponse.json({ error: "Jeu inconnu" }, { status: 400 });

    const ticketsSold = Number(body.ticketsSold) || 9_000_000;
    const jackpot = Number(body.jackpot) || 3_000_000;

    if (body.action === "generate") {
      const grids = generateGrids({
        game,
        count: Math.min(20, Math.max(1, Number(body.count) || 5)),
        ticketsSold,
        jackpot,
        include: body.include ?? [],
        exclude: body.exclude ?? [],
        maxOverlap: Number(body.maxOverlap ?? 2),
      });
      return NextResponse.json({ grids });
    }

    const combo: number[] = body.combo ?? [];
    if (combo.length !== game.main.pick) {
      return NextResponse.json(
        { error: `Il faut exactement ${game.main.pick} numéros.` },
        { status: 400 },
      );
    }
    return NextResponse.json(scoreCombination({ combo, game, ticketsSold, jackpot }));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
