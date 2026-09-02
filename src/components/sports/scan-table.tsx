import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScanRow } from "@/lib/sports/scan-types";
import { COMPETITIONS } from "@/lib/sports/labels";
import {
  displayTeamName,
  formatDayHeader,
  formatMatchDate,
  formatMatchTime,
} from "@/lib/sports/display";
import { groupRowsByDate, pickSummary, type SortMode } from "@/lib/sports/filter-rows";
import { StaggerList } from "@/components/motion/gsap-motion";
import { eur, pct } from "@/lib/utils";

const VERDICT_LABELS = {
  value: "Opportunité",
  neutre: "Aligné",
  éviter: "Surcôté",
} as const;

function favoriteIndex(probs: number[]): number {
  return probs.indexOf(Math.max(...probs));
}

function Recommendation({ row }: { row: ScanRow }) {
  const favIdx = favoriteIndex(row.probs);
  const favLabel = displayTeamName(row.labels[favIdx]);
  const favProb = row.probs[favIdx];

  if (row.bestEdge) {
    const edge = row.bestEdge;
    return (
      <div className="rounded-[14px] border border-edge/35 bg-edge/8 p-4">
        <p className="text-sm font-semibold text-edge">Opportunité détectée</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Le modèle estime <strong>{displayTeamName(edge.label)}</strong> à{" "}
          <strong>{pct(edge.modelProb, 0)}</strong>, le marché à{" "}
          <strong>{pct(edge.fairProb, 0)}</strong> — avantage de{" "}
          <strong className="text-edge">+{pct(edge.edge)}</strong>.
        </p>
        <p className="mt-2 text-sm text-muted">
          Meilleure cote <strong className="tnum text-ink">{edge.odds.toFixed(2)}</strong> chez{" "}
          {edge.bestBook}
          {edge.stake > 0 && (
            <>
              {" "}
              · mise suggérée <strong className="text-edge">{eur(edge.stake)}</strong>
            </>
          )}
        </p>
      </div>
    );
  }

  if (!row.market) {
    return (
      <div className="rounded-[14px] border border-line/50 bg-subtle p-4">
        <p className="text-sm font-semibold text-ink">Avis du modèle</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <strong className="text-ink">{favLabel}</strong> favori à{" "}
          <strong className="text-ink">{pct(favProb, 0)}</strong> — pas de cotes disponibles pour
          comparer au marché.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-line/50 bg-subtle p-4">
      <p className="text-sm font-semibold text-ink">Pas d&apos;écart significatif</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Favori probable : <strong className="text-ink">{favLabel}</strong> à{" "}
        <strong className="text-ink">{pct(favProb, 0)}</strong>. Le modèle et le marché sont
        alignés au-dessus du seuil.
      </p>
    </div>
  );
}

function ComparisonTable({ row }: { row: ScanRow }) {
  if (!row.market) {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-label">Probabilités du modèle</span>
        <div
          className={`grid gap-3 ${row.probs.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {row.probs.map((p, i) => (
            <div
              key={row.labels[i]}
              className={`flex flex-col gap-1 rounded-[14px] border px-4 py-3 ${
                i === favoriteIndex(row.probs)
                  ? "border-edge/35 bg-edge/8"
                  : "border-line/50 bg-subtle"
              }`}
            >
              <span className="truncate text-xs font-medium text-muted">
                {displayTeamName(row.labels[i])}
              </span>
              <span
                className={`tnum text-xl font-extrabold ${
                  i === favoriteIndex(row.probs) ? "text-edge" : "text-ink"
                }`}
              >
                {pct(p, 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label">Modèle vs marché</span>
      <div className="overflow-x-auto rounded-[14px] border border-line/50">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-line/50 bg-raised/50 text-left">
              <th className="px-4 py-2.5 font-semibold text-muted">Issue</th>
              <th className="tnum px-4 py-2.5 font-semibold text-muted">Modèle</th>
              <th className="tnum px-4 py-2.5 font-semibold text-muted">Marché</th>
              <th className="tnum px-4 py-2.5 font-semibold text-muted">Écart</th>
              <th className="tnum px-4 py-2.5 font-semibold text-muted">Cote</th>
              <th className="px-4 py-2.5 font-semibold text-muted">Signal</th>
            </tr>
          </thead>
          <tbody>
            {row.market.outcomes.map((o, i) => {
              const modelProb = row.probs[i];
              const delta = modelProb - o.fairProb;
              return (
                <tr key={o.label} className="border-b border-line/30 last:border-0">
                  <td className="max-w-[140px] truncate px-4 py-3 font-medium text-ink">
                    {displayTeamName(o.label)}
                  </td>
                  <td className="tnum px-4 py-3 font-bold text-ink">{pct(modelProb, 0)}</td>
                  <td className="tnum px-4 py-3 text-muted">{pct(o.fairProb, 0)}</td>
                  <td
                    className={`tnum px-4 py-3 font-semibold ${
                      delta > 0.02 ? "text-edge" : delta < -0.02 ? "text-warn" : "text-muted"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {pct(delta)}
                  </td>
                  <td className="tnum px-4 py-3 text-ink">
                    {o.odds.toFixed(2)}
                    <span className="ml-1 text-xs text-muted">({o.bestBook})</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        o.verdict === "value" ? "edge" : o.verdict === "éviter" ? "warn" : "neutral"
                      }
                    >
                      {VERDICT_LABELS[o.verdict]}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {row.bestEdge && row.bestEdge.stake > 0 && (
        <p className="text-xs text-muted">
          Mise suggérée calculée avec Kelly fractionnel (25 %) sur bankroll — indication, pas
          conseil de pari.
        </p>
      )}
    </div>
  );
}

function detailHref(row: ScanRow): Route {
  const params = new URLSearchParams();
  if (row.fixture.sport === "nba") {
    params.set("tab", "nba");
  } else {
    params.set("c", row.fixture.competition);
  }
  params.set("home", row.fixture.home);
  params.set("away", row.fixture.away);
  return `/sports?${params.toString()}` as Route;
}

function MatchCard({ row, rank }: { row: ScanRow; rank?: number }) {
  const time = formatMatchTime(row.fixture.commenceTime);
  const compLabel =
    COMPETITIONS[row.fixture.competition]?.label ??
    (row.fixture.sport === "nba" ? "NBA" : row.fixture.competition);
  const pick = pickSummary(row);

  return (
    <Card className={row.bestEdge ? "border-edge/35" : undefined}>
      <CardContent className="flex flex-col gap-4">
        {/* Pari principal — lisible en un coup d'œil */}
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line/50 bg-subtle px-4 py-3">
          {rank !== undefined && (
            <span className="tnum flex size-8 shrink-0 items-center justify-center rounded-full bg-edge/15 text-sm font-bold text-edge">
              {rank}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-xs text-muted">
              {pick.isDraw ? "Issue la plus probable" : "Victoire la plus probable"}
            </span>
            <span className="text-lg font-bold text-ink">
              {pick.isDraw ? "Match nul" : displayTeamName(pick.team)}{" "}
              <span className="tnum text-edge">{pct(pick.prob, 0)}</span>
            </span>
          </div>
          {row.bestEdge && (
            <Badge tone="edge" className="shrink-0">
              +{pct(row.bestEdge.edge)} vs marché
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">
                {formatMatchDate(row.fixture.commenceTime)}
                {time && ` · ${time}`}
              </Badge>
              <Badge tone="neutral">{compLabel}</Badge>
            </div>
            <h3 className="text-base font-semibold tracking-tight text-muted">
              <span>{displayTeamName(row.fixture.home)}</span>
              <span className="mx-2">vs</span>
              <span>{displayTeamName(row.fixture.away)}</span>
            </h3>
          </div>
          {!row.bestEdge && (
            <Badge tone={row.market ? "neutral" : "warn"} className="shrink-0">
              {row.market ? "Aligné marché" : "Sans cotes"}
            </Badge>
          )}
        </div>

        <Recommendation row={row} />

        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
            Comparaison détaillée modèle / marché
          </summary>
          <div className="mt-3">
            <ComparisonTable row={row} />
          </div>
        </details>

        <details className="group border-t border-line/50 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
            Détails techniques
          </summary>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            <span>
              Confiance <strong className="text-ink">{pct(row.confidence, 0)}</strong>
            </span>
            <span>
              Écart modèles <strong className="text-ink">{pct(row.disagreement, 0)}</strong>
            </span>
            <span
              className={
                row.modelSkill > 2 ? "text-edge" : row.modelSkill <= 0 ? "text-warn" : ""
              }
            >
              Fiabilité championnat{" "}
              <strong>
                {row.modelSkill > 0 ? "+" : ""}
                {row.modelSkill.toFixed(1)} %
              </strong>
            </span>
            {row.market && (
              <>
                <span>
                  {row.market.books} opérateurs
                  {row.market.sharpBook && (
                    <>
                      {" "}
                      · réf. <strong className="text-ink">{row.market.sharpBook}</strong>
                    </>
                  )}
                </span>
                <span>
                  Marge moyenne <strong className="text-ink">{pct(row.market.averageMargin)}</strong>
                </span>
              </>
            )}
            {row.extra && "lambda" in row.extra && (
              <span className="tnum">
                Buts attendus{" "}
                <strong className="text-ink">
                  {row.extra.lambda.toFixed(1)} – {row.extra.mu.toFixed(1)}
                </strong>
              </span>
            )}
            {row.extra && "spread" in row.extra && (
              <span className="tnum">
                Écart{" "}
                <strong className="text-ink">
                  {row.extra.spread > 0 ? "+" : ""}
                  {row.extra.spread.toFixed(1)}
                </strong>{" "}
                · Total <strong className="text-ink">{row.extra.total.toFixed(0)}</strong>
              </span>
            )}
          </div>
        </details>

        <Link
          href={detailHref(row)}
          className="text-sm font-semibold text-edge underline-offset-4 hover:underline"
        >
          Analyser ce match en détail →
        </Link>
      </CardContent>
    </Card>
  );
}

export function ScanTable({
  rows,
  sortMode = "faciles",
  animKey,
}: {
  rows: ScanRow[];
  sortMode?: SortMode;
  animKey?: string | number;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 className="font-bold text-ink">Aucun match ne correspond</h3>
          <p className="max-w-[62ch] text-sm leading-relaxed text-muted">
            Essaie d&apos;élargir les filtres, de retirer la recherche ou de choisir une autre
            compétition.
          </p>
          <Link
            href="/sports"
            className="text-sm font-semibold text-edge underline-offset-4 hover:underline"
          >
            Voir les modèles et la validation →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const ranked = sortMode !== "date";

  if (ranked) {
    return (
      <StaggerList resetKey={animKey} className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={row.fixture.id} data-animate-item>
            <MatchCard row={row} rank={i + 1} />
          </div>
        ))}
      </StaggerList>
    );
  }

  const groups = groupRowsByDate(rows);

  return (
    <StaggerList resetKey={animKey} className="flex flex-col gap-8">
      {groups.map(({ date, rows: dayRows }) => (
        <section key={date} data-animate-item className="flex flex-col gap-4">
          <h2 className="text-label">{formatDayHeader(date)}</h2>
          <div className="flex flex-col gap-4">
            {dayRows.map((row) => (
              <MatchCard key={row.fixture.id} row={row} />
            ))}
          </div>
        </section>
      ))}
    </StaggerList>
  );
}
