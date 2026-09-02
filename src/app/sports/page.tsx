import { Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import { Calendar, Database, Home, LineChart, Users } from "lucide-react";
import { Predictor } from "@/components/sports/predictor";
import { ValidationReport } from "@/components/sports/validation-report";
import { CompetitionPicker } from "@/components/sports/competition-picker";
import { CompetitionLogo } from "@/components/sports/competition-logo";
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
  searchParams: Promise<{ c?: string; tab?: string; home?: string; away?: string }>;
}) {
  const params = await searchParams;
  const codes = await competitions();
  const tab = params.tab === "nba" ? "nba" : "football";
  const code = params.c && codes.includes(params.c) ? params.c : defaultCompetition(codes);
  const initialHome = params.home;
  const initialAway = params.away;

  const football = code ? await footballPipeline(code) : { pipeline: null, error: null };
  const nba = await nbaPipeline();
  const competition = code ? COMPETITIONS[code] : null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Modèles sport"
        description="Analyse un match précis ou consulte la fiabilité des modèles sur chaque championnat. Les probabilités sont calculées indépendamment des cotes — celles-ci servent uniquement à la comparaison."
        link={{ href: "/sports/scan", label: "Matchs à venir →" }}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <LineChart className="size-4 shrink-0 text-accent" aria-hidden />
            Deux outils complémentaires
          </p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              <strong className="text-ink">Analyser un match</strong> — choisis deux équipes et
              obtiens les probabilités estimées, avec comparaison optionnelle au marché.
            </li>
            <li>
              <strong className="text-ink">Fiabilité du modèle</strong> — vérifie si le modèle bat
              les fréquences de base sur ce championnat avant de lui faire confiance.
            </li>
          </ul>
        </CardContent>
      </Card>

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
                      icon={Database}
                      label="Championnat"
                      value={
                        competition ? (
                          <span className="inline-flex items-center gap-2">
                            <CompetitionLogo code={code} size="sm" />
                            {competition.label}
                          </span>
                        ) : (
                          (code ?? "—")
                        )
                      }
                    />
                    <Meta icon={Calendar} label="Matchs appris" value={num(football.pipeline.matches)} />
                    <Meta
                      icon={Home}
                      label="Avantage terrain"
                      value={`×${Math.exp(football.pipeline.dc.homeAdvantage).toFixed(2)}`}
                      hint="Multiplicateur de buts à domicile"
                    />
                    <Meta icon={Calendar} label="Dernier match" value={football.pipeline.lastDate} />
                  </CardContent>
                </Card>

                <Predictor
                  sport="football"
                  competition={code}
                  teams={football.pipeline.teams}
                  initialHome={initialHome}
                  initialAway={initialAway}
                />

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
                  <Meta icon={Calendar} label="Matchs appris" value={num(nba.pipeline.games)} />
                  <Meta icon={Users} label="Équipes" value={String(nba.pipeline.teams.length)} />
                  <Meta
                    icon={Database}
                    label="Matchs de test"
                    value={num(nba.pipeline.holdout)}
                    hint="Réservés, jamais vus à l'entraînement"
                  />
                </CardContent>
              </Card>

              <Predictor
                sport="nba"
                teams={nba.pipeline.teams}
                initialHome={initialHome}
                initialAway={initialAway}
              />

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

function Meta({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden /> : null}
        {label}
      </span>
      <span className="tnum text-lg font-bold text-ink">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
