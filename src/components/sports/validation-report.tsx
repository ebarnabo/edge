import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendChart, CalibrationChart, SERIES_COLORS } from "@/components/charts";
import { num, pct } from "@/lib/utils";

export interface ReportRow {
  name: string;
  logLoss: number;
  brier: number;
  accuracy: number;
  calibrationError: number;
  skill: number;
  rps?: number;
}

export function ValidationReport({
  reports,
  baselineName,
  trend,
  trendMetric,
  calibration,
  featureImportance,
  blend,
  holdout,
  sample,
}: {
  reports: ReportRow[];
  baselineName: string;
  trend: { date: string; models: number[]; baseline: number }[];
  trendMetric: string;
  calibration: { predicted: number; observed: number; count: number }[];
  featureImportance: { name: string; weight: number; direction: number }[];
  blend: { weights: number[]; temperature: number };
  holdout: number;
  sample: number;
}) {
  const best = reports.reduce((a, b) => (b.skill > a.skill ? b : a));
  const maxWeight = featureImportance[0]?.weight || 1;

  const trendData = trend.map((t) => {
    const row: Record<string, number | string> = {
      label: t.date.slice(0, 7),
      [baselineName]: Number(t.baseline.toFixed(4)),
    };
    reports.forEach((r, i) => {
      row[r.name] = Number(t.models[i].toFixed(4));
    });
    return row;
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ce que valent réellement ces modèles</CardTitle>
          <CardDescription>
            Validation par origine glissante sur {num(sample)} matchs : à chaque étape, les modèles
            sont réajustés sur le passé strict puis notés sur des matchs jamais vus. Les chiffres
            ci-dessous portent sur les {num(holdout)} derniers, réservés et jamais utilisés pour
            choisir le mélange.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="overflow-x-auto rounded-[14px] border border-line/50">
            <table className="data-table min-w-[600px] px-4">
              <thead>
                <tr>
                  <th className="px-4">Modèle</th>
                  <th>Log-perte</th>
                  {reports[0]?.rps !== undefined && <th>RPS</th>}
                  <th>Brier</th>
                  <th>Exactitude</th>
                  <th>Erreur calib.</th>
                  <th>Apport</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {reports.map((r) => (
                  <tr key={r.name}>
                    <td className="px-4 font-semibold text-ink">
                      {r.name}
                      {r === best && (
                        <Badge tone="edge" className="ml-2">
                          meilleur
                        </Badge>
                      )}
                    </td>
                    <td>{r.logLoss.toFixed(4)}</td>
                    {r.rps !== undefined && <td>{r.rps.toFixed(4)}</td>}
                    <td>{r.brier.toFixed(4)}</td>
                    <td>{pct(r.accuracy)}</td>
                    <td>{pct(r.calibrationError, 2)}</td>
                    <td className={`font-bold ${r.skill > 0 ? "text-edge" : "text-warn"}`}>
                      {r.skill > 0 ? "+" : ""}
                      {r.skill.toFixed(2)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="max-w-[70ch] border-t border-line/60 pt-6 text-sm leading-relaxed text-muted">
            L&apos;apport mesure le gain de log-perte face aux fréquences de base de la
            compétition. Un modèle sous zéro fait pire que de répondre « 45 % domicile, 26 % nul,
            29 % extérieur » à chaque match. Le mélange retenu pèse{" "}
            {blend.weights.map((w) => pct(w, 0)).join(" / ")} avec une température de{" "}
            {blend.temperature.toFixed(2)} — sous 1, il durcit les probabilités ; au-dessus, il les
            adoucit.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tendance de la performance</CardTitle>
          <CardDescription>
            {trendMetric} sur fenêtre glissante. Plus bas vaut mieux. Un modèle qui remonte vers la
            ligne des fréquences de base a perdu son avantage — championnat transformé, effectifs
            renouvelés, ou surajustement qui se paie.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <TrendChart
            data={trendData}
            series={[
              ...reports.map((r, i) => ({
                key: r.name,
                label: r.name,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
              })),
              { key: baselineName, label: baselineName, color: "oklch(0.62 0.014 264)", dashed: true },
            ]}
            yLabel={trendMetric}
            height={320}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fiabilité des probabilités</CardTitle>
            <CardDescription>
              Sur l&apos;ensemble des matchs annoncés à 60 %, l&apos;issue doit se produire environ
              60 fois sur 100. Un écart durable au-dessus de la diagonale signale un modèle trop
              prudent, en dessous un modèle trop sûr de lui.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <CalibrationChart data={calibration} height={280} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ce qui pèse dans la prédiction</CardTitle>
            <CardDescription>
              Poids appris par le modèle discriminant sur variables standardisées, donc
              directement comparables entre eux.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-6">
            {featureImportance.slice(0, 8).map((f) => (
              <div key={f.name} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-ink">{f.name}</span>
                  <span className="tnum text-xs text-muted">{f.weight.toFixed(3)}</span>
                </div>
                <span className="h-2 overflow-hidden rounded-full bg-subtle">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(f.weight / maxWeight) * 100}%`,
                      background: f.direction >= 0 ? SERIES_COLORS[0] : SERIES_COLORS[2],
                    }}
                  />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
