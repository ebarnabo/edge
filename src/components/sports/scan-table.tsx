import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/components/ui/metric";
import type { ScanRow } from "@/lib/sports/scan";
import { COMPETITION_LABELS } from "@/lib/sports/labels";
import { eur, pct } from "@/lib/utils";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export function ScanTable({ rows }: { rows: ScanRow[] }) {
  return (
    <ul className="flex flex-col gap-5">
      {rows.map((row) => (
        <li key={row.fixture.id}>
          <Card className={row.bestEdge ? "border-edge/35" : undefined}>
            <CardContent className="flex flex-col gap-6">
              {/* En-tête match */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{dayLabel(row.fixture.commenceTime)}</Badge>
                    <Badge tone="neutral">
                      {COMPETITION_LABELS[row.fixture.competition] ?? row.fixture.competition}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-balance sm:text-xl">
                    <span className="text-ink">{row.fixture.home}</span>
                    <span className="mx-2 font-medium text-muted">vs</span>
                    <span className="text-ink">{row.fixture.away}</span>
                  </h3>
                </div>

                {row.bestEdge ? (
                  <Badge tone="edge" className="shrink-0 text-sm">
                    Écart +{pct(row.bestEdge.edge)}
                  </Badge>
                ) : row.market ? (
                  <Badge className="shrink-0">Aligné marché</Badge>
                ) : (
                  <Badge tone="warn" className="shrink-0">
                    Sans cotes
                  </Badge>
                )}
              </div>

              {/* Probabilités modèle */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {row.probs.map((p, i) => (
                  <Metric
                    key={row.labels[i]}
                    label={row.labels[i]}
                    value={pct(p, 0)}
                    highlight={p === Math.max(...row.probs)}
                  />
                ))}
              </div>

              {/* Marché */}
              {row.market && (
                <div className="flex flex-col gap-4 rounded-[14px] border border-line/50 bg-subtle p-4">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                    <span>
                      <strong className="text-ink">{row.market.books}</strong> opérateurs
                    </span>
                    {row.market.sharpBook && (
                      <span>
                        Réf. <strong className="text-ink">{row.market.sharpBook}</strong>
                      </span>
                    )}
                    <span>
                      Marge <strong className="text-ink">{pct(row.market.averageMargin)}</strong>
                    </span>
                    <span>
                      Meilleur prix{" "}
                      <strong className="text-edge">+{pct(row.market.bestPriceGain)}</strong>
                    </span>
                  </div>

                  <ul className="flex flex-col gap-1">
                    {row.market.outcomes.map((o) => (
                      <li key={o.label} className="data-row">
                        <span className="flex min-w-0 items-center gap-3">
                          <Badge
                            tone={
                              o.verdict === "value" ? "edge" : o.verdict === "éviter" ? "warn" : "neutral"
                            }
                          >
                            {o.verdict}
                          </Badge>
                          <span className="truncate text-sm font-medium text-ink">{o.label}</span>
                        </span>
                        <span className="tnum flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                          <span className="text-ink">
                            {o.odds.toFixed(2)}{" "}
                            <span className="text-muted">({o.bestBook})</span>
                          </span>
                          <span className="text-muted">Marché {pct(o.fairProb, 0)}</span>
                          {o.stake > 0 && (
                            <span className="font-bold text-edge">Mise {eur(o.stake)}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Métadonnées modèle */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line/50 pt-4 text-sm text-muted">
                <span>
                  Netteté <strong className="text-ink">{pct(row.confidence, 0)}</strong>
                </span>
                <span>
                  Divergence <strong className="text-ink">{pct(row.disagreement, 0)}</strong>
                </span>
                <span className={row.modelSkill > 2 ? "text-edge" : row.modelSkill <= 0 ? "text-warn" : ""}>
                  Apport modèle{" "}
                  <strong>
                    {row.modelSkill > 0 ? "+" : ""}
                    {row.modelSkill.toFixed(1)} %
                  </strong>
                </span>
                {row.extra && "lambda" in row.extra && (
                  <span className="tnum">
                    Buts{" "}
                    <strong className="text-ink">
                      {row.extra.lambda.toFixed(2)} – {row.extra.mu.toFixed(2)}
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
            </CardContent>
          </Card>
        </li>
      ))}

      {rows.length === 0 && (
        <li>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <h3 className="font-bold text-ink">Aucun match exploitable</h3>
              <p className="max-w-[62ch] text-sm leading-relaxed text-muted">
                Soit le calendrier est vide, soit les équipes annoncées ne correspondent à aucune
                équipe apprise par les modèles. Vérifie que l&apos;historique de la compétition est
                bien importé.
              </p>
              <Link href="/sports" className="text-sm font-semibold text-edge underline-offset-4 hover:underline">
                Revenir aux modèles
              </Link>
            </CardContent>
          </Card>
        </li>
      )}
    </ul>
  );
}
