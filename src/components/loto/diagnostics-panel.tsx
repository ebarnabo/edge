import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { TrendChart, DistributionChart, SERIES_COLORS } from "@/components/charts";
import type { GameConfig } from "@/lib/fdj/games";
import type { Draw } from "@/lib/fdj/types";
import {
  gapLaw,
  rollingUniformity,
  serialIndependence,
  strategyBacktest,
  sumDistribution,
  type TestResult,
} from "@/lib/loto/diagnostics";
import { num } from "@/lib/utils";

export function DiagnosticsPanel({ game, draws }: { game: GameConfig; draws: Draw[] }) {
  const rolling = rollingUniformity(draws, game);
  const sums = sumDistribution(draws, game);
  const tests: TestResult[] = [serialIndependence(draws, game), gapLaw(draws, game), sums.test];
  const bt = strategyBacktest(draws, game);

  const df = game.main.pool - 1;
  const rollingData = rolling.map((p) => ({
    label: p.date.slice(0, 4),
    "χ² observé": Number(p.chiSquare.toFixed(1)),
  }));

  const strategyData = bt.labels.map((label, i) => {
    const row: Record<string, number | string> = { label };
    for (const s of bt.strategies) row[s.label] = Number((s.curve[i] ?? NaN).toFixed(4));
    return row;
  });

  const band = { from: bt.theoretical - 2 * bt.standardError, to: bt.theoretical + 2 * bt.standardError };
  const anySignal = tests.some((t) => !t.passed) || bt.strategies.some((s) => Math.abs(s.z) > 2);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Recherche de signal</CardTitle>
          <CardDescription>
            Quatre tests conçus pour détecter une structure : dérive de la machine, mémoire entre
            tirages, loi des écarts, distribution des sommes. Ils sont écrits pour trouver un
            signal s&apos;il existe — c&apos;est ce qui rend leur résultat interprétable.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-8 pt-6">
          <ul className="flex flex-col gap-2">
            {tests.map((t) => (
              <li
                key={t.name}
                className="flex flex-col gap-3 rounded-[20px] border border-line/60 bg-raised/30 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-bold">{t.name}</span>
                  <span className="flex items-center gap-3">
                    <span className="tnum text-xs text-faint">
                      stat {t.statistic.toFixed(1)} · p = {t.pValue.toFixed(3)}
                    </span>
                    <Badge tone={t.passed ? "edge" : "warn"}>
                      {t.passed ? "aucun signal" : "écart détecté"}
                    </Badge>
                  </span>
                </div>
                <p className="max-w-[70ch] text-sm leading-relaxed text-muted">{t.reading}</p>
                <p className="text-xs text-faint">{t.reference}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dérive de la machine dans le temps</CardTitle>
          <CardDescription>
            χ² d&apos;uniformité sur une fenêtre glissante de 260 tirages. Une boule usée ou une
            machine déréglée produirait une montée durable au-dessus de la ligne de référence. Une
            oscillation autour de {df} est le comportement attendu d&apos;un tirage sain.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <TrendChart
            data={rollingData}
            series={[{ key: "χ² observé", label: "χ² sur 260 tirages", color: SERIES_COLORS[1] }]}
            reference={{ value: df, label: `${df} ddl` }}
            yLabel="χ²"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribution des sommes</CardTitle>
          <CardDescription>
            Somme des {game.main.pick} numéros, observée contre la loi exacte obtenue par
            dénombrement de toutes les combinaisons. La cloche n&apos;est pas un biais : elle vient
            du fait qu&apos;il existe beaucoup plus de façons d&apos;obtenir 125 que 20.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <DistributionChart data={sums.bins} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Six façons de choisir ses numéros, mises à l&apos;épreuve</CardTitle>
          <CardDescription>
            Simulation à l&apos;aveugle sur {num(bt.sampled)} tirages : à chaque tirage, la grille
            est composée avec la seule information disponible avant le tirage, puis confrontée au
            résultat réel. La courbe donne le nombre moyen de bons numéros accumulé.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-8 pt-6">
          <TrendChart
            data={strategyData}
            series={bt.strategies.map((s, i) => ({
              key: s.label,
              label: s.label,
              color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))}
            band={band}
            reference={{ value: bt.theoretical, label: bt.theoretical.toFixed(3) }}
            yLabel="bons numéros"
            height={340}
          />

          <ul className="flex flex-col gap-1">
            {bt.strategies.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] px-4 py-3 odd:bg-raised/30"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="text-xs text-faint">{s.description}</span>
                </span>
                <span className="tnum flex items-center gap-4 text-sm">
                  <span className="text-muted">{s.meanMatches.toFixed(4)}</span>
                  <Badge tone={Math.abs(s.z) < 2 ? "neutral" : "warn"}>
                    {s.z > 0 ? "+" : ""}
                    {s.z.toFixed(2)} σ
                  </Badge>
                </span>
              </li>
            ))}
          </ul>

          <div className="grid gap-8 border-t border-line/60 pt-8 sm:grid-cols-3">
            <Stat label="Moyenne théorique" value={bt.theoretical.toFixed(4)} />
            <Stat label="Erreur type" value={`± ${bt.standardError.toFixed(4)}`} />
            <Stat
              label="Verdict"
              value={anySignal ? "à examiner" : "aucun écart"}
              tone={anySignal ? "warn" : "edge"}
              hint={
                anySignal
                  ? "Un test dépasse le seuil. Sur une batterie de quatre tests plus six stratégies, un dépassement isolé reste attendu par pur hasard."
                  : "Les six méthodes rapportent le même nombre de bons numéros, aux fluctuations près. Choisir ses numéros autrement ne change rien au résultat."
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
