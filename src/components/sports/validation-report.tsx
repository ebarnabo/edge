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
  const ensemble = reports.find((r) => r.name.toLowerCase().includes("blend") || r.name.toLowerCase().includes("mélange")) ?? best;
  const maxWeight = featureImportance[0]?.weight || 1;

  const trustLevel =
    ensemble.skill >= 5 ? "élevée" : ensemble.skill >= 2 ? "modérée" : ensemble.skill > 0 ? "faible" : "insuffisante";

  const trustTone =
    ensemble.skill >= 5 ? "edge" : ensemble.skill >= 2 ? "neutral" : "warn";

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
      {/* Résumé de confiance */}
      <Card className={ensemble.skill > 0 ? "border-edge/25" : "border-warn/25"}>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Fiabilité du modèle sur ce championnat</h2>
            <Badge tone={trustTone as "edge" | "warn" | "neutral"}>
              Confiance {trustLevel}
            </Badge>
          </div>
          <p className="max-w-[68ch] text-sm leading-relaxed text-muted">
            Testé sur <strong className="text-ink">{num(holdout)} matchs</strong> jamais vus
            pendant l&apos;entraînement. Le mélange d&apos;ensemble bat les fréquences de base de{" "}
            <strong className={ensemble.skill > 0 ? "text-edge" : "text-warn"}>
              {ensemble.skill > 0 ? "+" : ""}
              {ensemble.skill.toFixed(1)} %
            </strong>
            {ensemble.skill <= 0 && " — le modèle ne fait pas mieux que deviner au hasard."}
            {ensemble.skill > 0 && ensemble.skill < 3 && " — écarts faibles, prudence recommandée."}
            {ensemble.skill >= 3 && " — signal exploitable avec prudence."}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span>
              Exactitude <strong className="text-ink">{pct(ensemble.accuracy, 0)}</strong>
            </span>
            <span>
              Erreur de calibration{" "}
              <strong className="text-ink">{pct(ensemble.calibrationError, 1)}</strong>
            </span>
            <span>
              Mélange{" "}
              <strong className="text-ink">{blend.weights.map((w) => pct(w, 0)).join(" / ")}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tableau comparatif des modèles */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison des modèles</CardTitle>
          <CardDescription>
            Chaque modèle est évalué sur des matchs qu&apos;il n&apos;a jamais vus. L&apos;apport
            mesure le gain face à « deviner les fréquences moyennes du championnat ».
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="overflow-x-auto rounded-[14px] border border-line/50">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-line/50 bg-raised/50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-muted">Modèle</th>
                  <th className="tnum px-4 py-2.5 font-semibold text-muted">Exactitude</th>
                  <th className="tnum px-4 py-2.5 font-semibold text-muted">Erreur calib.</th>
                  <th className="tnum px-4 py-2.5 font-semibold text-muted">Apport</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.name} className="border-b border-line/30 last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">
                      {r.name}
                      {r === best && (
                        <Badge tone="edge" className="ml-2">
                          meilleur
                        </Badge>
                      )}
                    </td>
                    <td className="tnum px-4 py-3">{pct(r.accuracy, 0)}</td>
                    <td className="tnum px-4 py-3">{pct(r.calibrationError, 1)}</td>
                    <td className={`tnum px-4 py-3 font-bold ${r.skill > 0 ? "text-edge" : "text-warn"}`}>
                      {r.skill > 0 ? "+" : ""}
                      {r.skill.toFixed(1)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Graphiques repliables */}
      <details className="group">
        <summary className="cursor-pointer rounded-[14px] border border-line/50 bg-subtle px-5 py-4 text-sm font-semibold text-muted hover:text-ink">
          Graphiques de validation ({num(sample)} matchs analysés)
        </summary>
        <div className="mt-4 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Évolution de la performance</CardTitle>
              <CardDescription>
                {trendMetric} sur fenêtre glissante — plus bas = mieux. Si la courbe remonte vers la
                ligne de base, le modèle perd son avantage.
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
                  {
                    key: baselineName,
                    label: baselineName,
                    color: "oklch(0.62 0.014 264)",
                    dashed: true,
                  },
                ]}
                yLabel={trendMetric}
                height={320}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Calibration des probabilités</CardTitle>
                <CardDescription>
                  Quand le modèle annonce 60 %, l&apos;issue doit se produire ~60 fois sur 100.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <CalibrationChart data={calibration} height={280} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facteurs les plus influents</CardTitle>
                <CardDescription>Poids appris par le modèle discriminant.</CardDescription>
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
      </details>

      {/* Métriques techniques repliables */}
      <details className="group">
        <summary className="cursor-pointer rounded-[14px] border border-line/50 bg-subtle px-5 py-4 text-sm font-semibold text-muted hover:text-ink">
          Métriques techniques détaillées
        </summary>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="overflow-x-auto rounded-[14px] border border-line/50">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-line/50 bg-raised/50 text-left">
                    <th className="px-4 py-2.5 font-semibold text-muted">Modèle</th>
                    <th className="tnum px-4 py-2.5 font-semibold text-muted">Log-perte</th>
                    {reports[0]?.rps !== undefined && (
                      <th className="tnum px-4 py-2.5 font-semibold text-muted">RPS</th>
                    )}
                    <th className="tnum px-4 py-2.5 font-semibold text-muted">Brier</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.name} className="border-b border-line/30 last:border-0">
                      <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
                      <td className="tnum px-4 py-3">{r.logLoss.toFixed(4)}</td>
                      {r.rps !== undefined && <td className="tnum px-4 py-3">{r.rps.toFixed(4)}</td>}
                      <td className="tnum px-4 py-3">{r.brier.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-muted">
              Température du mélange : {blend.temperature.toFixed(2)} — sous 1, les probabilités sont
              durcies ; au-dessus, adoucies.
            </p>
          </CardContent>
        </Card>
      </details>
    </div>
  );
}
