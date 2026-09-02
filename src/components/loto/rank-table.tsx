import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { rankTable, totalCombinations } from "@/lib/loto/probability";
import type { GameConfig } from "@/lib/fdj/games";
import { num } from "@/lib/utils";

export function RankTable({ game }: { game: GameConfig }) {
  const ranks = rankTable(game).filter((r) => r.main >= Math.max(1, game.main.pick - 3));
  const total = totalCombinations(game);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Probabilités exactes par rang</CardTitle>
        <CardDescription>
          Calculées par loi hypergéométrique sur les {num(total)} combinaisons possibles. Ces
          valeurs ne dépendent d&apos;aucun historique.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ul className="flex flex-col gap-1">
          {ranks.map((r) => (
            <li key={r.label} className="data-row">
              <span className="text-sm font-semibold text-ink">{r.label}</span>
              <span className="flex items-baseline gap-4">
                <span className="tnum text-sm text-muted">1 sur {num(Math.round(r.odds))}</span>
                <span
                  aria-hidden
                  className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-line/50 sm:block"
                >
                  <span
                    className="block h-full rounded-full bg-loto"
                    style={{ width: `${Math.max(1.5, Math.min(100, r.probability * 320))}%` }}
                  />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
