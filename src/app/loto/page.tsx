import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { GAME_LIST } from "@/lib/fdj/games";
import { totalCombinations } from "@/lib/loto/probability";
import { loadDraws } from "@/lib/data";
import { eur, num, pct } from "@/lib/utils";

export default async function LotoIndex() {
  const games = await Promise.all(
    GAME_LIST.map(async (game) => ({ game, data: await loadDraws(game.id) })),
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Jeux de tirage"
        description="Historique officiel FDJ, probabilités exactes et coût réel de la mise. Choisis un jeu pour voir son test d'uniformité et construire un système réducteur."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {games.map(({ game, data }) => (
          <li key={game.id}>
            <Link href={`/loto/${game.id}`} className="block h-full">
              <Card className="elevated-hover h-full">
                <CardContent className="flex h-full flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-bold tracking-tight text-ink">{game.label}</h2>
                    <Badge tone={data ? "edge" : "warn"}>
                      {data ? `${num(data.count)} tirages` : "à importer"}
                    </Badge>
                  </div>

                  <dl className="mt-auto grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1">
                      <dt className="text-label">Rang 1</dt>
                      <dd className="tnum text-sm font-bold text-ink">
                        1 sur {num(totalCombinations(game))}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-label">Grille · retour</dt>
                      <dd className="tnum text-sm font-bold text-ink">
                        {eur(game.price)} · {pct(game.trj, 0)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
