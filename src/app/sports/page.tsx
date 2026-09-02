import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Predictor } from "@/components/sports/predictor";
import { ValidationReport } from "@/components/sports/validation-report";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { footballPipeline, nbaPipeline, competitions } from "@/lib/sports/models";
import { COMPETITION_LABELS } from "@/lib/sports/labels";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SportsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const codes = await competitions();
  const { c } = await searchParams;
  const code = c && codes.includes(c) ? c : codes[0];

  const football = code ? await footballPipeline(code) : { pipeline: null, error: null };
  const nba = await nbaPipeline();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Modèles validés"
        title="Sport"
        description="Contrairement aux tirages, un match porte de l'information. Les modèles apprennent sur les résultats réels, sont validés sur des matchs qu'ils n'ont jamais vus, et ne consultent les cotes qu'après avoir tranché."
      />

      <Tabs defaultValue="football">
        <TabsList>
          <TabsTrigger value="football">Football</TabsTrigger>
          <TabsTrigger value="nba">NBA</TabsTrigger>
        </TabsList>

        <TabsContent value="football" className="flex flex-col gap-6">
          {football.pipeline ? (
            <>
              <Card>
                <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                  <Meta label="Compétition" value={COMPETITION_LABELS[code!] ?? code!} />
                  <Meta label="Matchs appris" value={num(football.pipeline.matches)} />
                  <Meta
                    label="Avantage terrain"
                    value={`×${Math.exp(football.pipeline.dc.homeAdvantage).toFixed(2)}`}
                  />
                  <Meta label="Correction ρ" value={football.pipeline.dc.rho.toFixed(3)} />
                  <Meta label="Dernier match" value={football.pipeline.lastDate} />
                </CardContent>
              </Card>

              <Predictor sport="football" competition={code} teams={football.pipeline.teams} />

              <ValidationReport
                reports={football.pipeline.validation.reports}
                baselineName="Fréquences de base"
                trend={football.pipeline.validation.trend}
                trendMetric="RPS"
                calibration={football.pipeline.validation.calibration}
                featureImportance={football.pipeline.validation.featureImportance}
                blend={football.pipeline.validation.blendConfig}
                holdout={football.pipeline.validation.holdout}
                sample={football.pipeline.validation.evaluated}
              />
            </>
          ) : football.error ? (
            <EmptyState
              title="Validation impossible"
              hint={`${football.error} Importe une saison supplémentaire pour que la validation par origine glissante ait de quoi travailler.`}
              command="npm run ingest:football -- FL1 PL"
            />
          ) : (
            <EmptyState
              title="Aucun résultat de football"
              hint="Ajoute FOOTBALL_DATA_TOKEN (clé gratuite sur football-data.org), puis lance l'import. Trois saisons donnent un ajustement stable."
              command="npm run ingest:football -- FL1 PL PD"
            />
          )}
        </TabsContent>

        <TabsContent value="nba" className="flex flex-col gap-6">
          {nba.pipeline ? (
            <>
              <Card>
                <CardContent className="grid gap-6 sm:grid-cols-3">
                  <Meta label="Matchs appris" value={num(nba.pipeline.games)} />
                  <Meta label="Équipes" value={String(nba.pipeline.teams.length)} />
                  <Meta label="Matchs de test réservés" value={num(nba.pipeline.holdout)} />
                </CardContent>
              </Card>

              <Predictor sport="nba" teams={nba.pipeline.teams} />

              <ValidationReport
                reports={nba.pipeline.reports}
                baselineName="Fréquences de base"
                trend={nba.pipeline.trend}
                trendMetric="Brier"
                calibration={nba.pipeline.calibration}
                featureImportance={nba.pipeline.featureImportance}
                blend={nba.pipeline.blendConfig}
                holdout={nba.pipeline.holdout}
                sample={nba.pipeline.games}
              />
            </>
          ) : nba.error ? (
            <EmptyState
              title="Validation impossible"
              hint={`${nba.error} Importe une saison supplémentaire.`}
              command="npm run ingest:nba"
            />
          ) : (
            <EmptyState
              title="Aucun résultat NBA"
              hint="Ajoute BALLDONTLIE_KEY (clé gratuite sur app.balldontlie.io), puis lance l'import."
              command="npm run ingest:nba"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label">{label}</span>
      <span className="tnum text-lg font-bold text-ink">{value}</span>
    </div>
  );
}
