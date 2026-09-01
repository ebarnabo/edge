import { notFound } from "next/navigation";
import { GAMES, type GameId } from "@/lib/fdj/games";
import { analyse } from "@/lib/loto/stats";
import { loadDraws } from "@/lib/data";
import { RandomnessVerdict } from "@/components/loto/randomness-verdict";
import { RankTable } from "@/components/loto/rank-table";
import { EvPanel } from "@/components/loto/ev-panel";
import { WheelBuilder } from "@/components/loto/wheel-builder";
import { DiagnosticsPanel } from "@/components/loto/diagnostics-panel";
import { PopularityPanel } from "@/components/loto/popularity-panel";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { num } from "@/lib/utils";

export function generateStaticParams() {
  return Object.keys(GAMES).map((game) => ({ game }));
}

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game: id } = await params;
  const game = GAMES[id as GameId];
  if (!game) notFound();

  const data = await loadDraws(game.id);

  if (!data) {
    return (
      <div className="flex flex-col gap-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{game.label}</h1>
        <EmptyState
          title="Aucun historique en local"
          hint="Le script télécharge les archives ZIP publiées par FDJ, les décompresse et normalise les tirages dans /data. Compte quelques secondes."
          command={`npm run ingest:fdj -- ${game.id}`}
        />
        <RankTable game={game} />
      </div>
    );
  }

  const analysis = analyse(game, data.draws);
  const last = data.draws[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{game.label}</h1>
          <Badge>{num(data.count)} tirages depuis {data.from.slice(0, 4)}</Badge>
        </div>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          Dernier tirage du {new Date(last.date).toLocaleDateString("fr-FR")} :
          <span className="tnum flex gap-1.5">
            {last.main.map((n) => (
              <span
                key={n}
                className="flex size-7 items-center justify-center rounded-full bg-raised font-bold text-ink"
              >
                {n}
              </span>
            ))}
            {last.bonus.map((n) => (
              <span
                key={`b${n}`}
                className="flex size-7 items-center justify-center rounded-full bg-loto/20 font-bold text-loto"
              >
                {n}
              </span>
            ))}
          </span>
        </p>
      </header>

      <RandomnessVerdict analysis={analysis} />
      <DiagnosticsPanel game={game} draws={data.draws} />
      <EvPanel game={game} />
      <PopularityPanel game={game} stats={analysis.main} />
      <WheelBuilder game={game} stats={analysis.main} />
      <RankTable game={game} />
    </div>
  );
}
