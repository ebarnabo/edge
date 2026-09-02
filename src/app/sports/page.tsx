import { Suspense } from "react";
import { Predictor } from "@/components/sports/predictor";
import { ValidationReport } from "@/components/sports/validation-report";
import { CompetitionPicker } from "@/components/sports/competition-picker";
import { SportTabs } from "@/components/sports/sport-tabs";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { footballPipeline, nbaPipeline, competitions } from "@/lib/sports/models";
import { COMPETITIONS, defaultCompetition } from "@/lib/sports/labels";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SportsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const codes = await competitions();
  const tab = params.tab === "nba" ? "nba" : "football";
  const code = params.c && codes.includes(params.c) ? params.c : defaultCompetition(codes);

  const football = code ? await footballPipeline(code) : { pipeline: null, error: null };
  const nba = await nbaPipeline();
  const competition = code ? COMPETITIONS[code] : null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Modèles validés"
        title="Sport"
        description="Contrairement aux tirages, un match porte de l'information. Les modèles apprennent sur les résultats réels, sont validés sur des matchs qu'ils n'ont jamais vus, et ne consultent les cotes qu'après avoir tranché."
      />

      <SportTabs
        tab={tab}
        football={
          <>
            {codes.length > 0 && code && (
              <Suspense fallback={null}>
                <CompetitionPicker codes={codes} active={code} />
              </Suspense>
            )}

            {football.pipeline ? (
              <>
                <Card>
                  <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Meta
                      label="Championnat"
                      value={
                        competition
                          ? `${competition.flag} ${competition.label}`
                          : (code ?? "—")
                      }
                    />
                    <Meta label="Matchs appris" value={num(football.pipeline.matches)} />
                    <Meta
                      label="Avantage terrain"
                      value={`×${Math.exp(football.pipeline.dc.homeAdvantage).toFixed(2)}`}
                    />
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
          </>
        }
        nba={
          nba.pipeline ? (
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
          )
        }
      />
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
