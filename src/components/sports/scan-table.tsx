import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScanRow } from "@/lib/sports/scan";
import { COMPETITION_LABELS } from "@/lib/sports/labels";
import { eur, pct } from "@/lib/utils";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export function ScanTable({ rows }: { rows: ScanRow[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.fixture.id}>
          <Card className={row.bestEdge ? "border-edge/30" : undefined}>
            <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-faint">
                    <span>{dayLabel(row.fixture.commenceTime)}</span>
                    <span aria-hidden>·</span>
                    <span>{COMPETITION_LABELS[row.fixture.competition] ?? row.fixture.competition}</span>
                  </span>
                  <h3 className="text-base font-bold tracking-tight text-balance sm:text-lg">
                    {row.fixture.home} <span className="text-faint">contre</span> {row.fixture.away}
                  </h3>
                </div>

                {row.bestEdge ? (
                  <Badge tone="edge" className="shrink-0">
                    écart +{pct(row.bestEdge.edge)}
                  </Badge>
                ) : row.market ? (
                  <Badge className="shrink-0">aligné sur le marché</Badge>
                ) : (
                  <Badge className="shrink-0">sans cotes</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                {row.probs.map((p, i) => (
                  <div key={row.labels[i]} className="flex flex-col gap-1">
                    <span className="truncate text-xs text-faint">{row.labels[i]}</span>
                    <span
                      className={`tnum text-lg font-extrabold sm:text-xl ${
                        p === Math.max(...row.probs) ? "text-edge" : "text-ink"
                      }`}
                    >
                      {pct(p, 0)}
                    </span>
                  </div>
                ))}
              </div>

              {row.market && (
                <div className="flex flex-col gap-3 border-t border-line/60 pt-6">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-faint">
                    <span>{row.market.books} opérateurs</span>
                    {row.market.sharpBook && <span>référence {row.market.sharpBook}</span>}
                    <span>marge {pct(row.market.averageMargin)}</span>
                    <span>meilleur prix +{pct(row.market.bestPriceGain)}</span>
                  </div>

                  <ul className="flex flex-col gap-1">
                    {row.market.outcomes.map((o) => (
                      <li
                        key={o.label}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-3 py-2 text-sm odd:bg-raised/30"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Badge
                            tone={o.verdict === "value" ? "edge" : o.verdict === "éviter" ? "warn" : "neutral"}
                          >
                            {o.verdict}
                          </Badge>
                          <span className="truncate">{o.label}</span>
                        </span>
                        <span className="tnum flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted">
                          <span>
                            {o.odds.toFixed(2)} <span className="text-faint">{o.bestBook}</span>
                          </span>
                          <span>marché {pct(o.fairProb, 0)}</span>
                          {o.stake > 0 && <span className="font-bold text-edge">{eur(o.stake)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line/60 pt-6 text-xs text-faint">
                <span>netteté {pct(row.confidence, 0)}</span>
                <span>divergence des modèles {pct(row.disagreement, 0)}</span>
                <span
                  className={row.modelSkill > 2 ? "text-edge" : row.modelSkill <= 0 ? "text-warn" : undefined}
                >
                  apport du modèle {row.modelSkill > 0 ? "+" : ""}
                  {row.modelSkill.toFixed(1)} %
                </span>
                {row.extra && "lambda" in row.extra && (
                  <span className="tnum">
                    buts {row.extra.lambda.toFixed(2)} – {row.extra.mu.toFixed(2)}
                  </span>
                )}
                {row.extra && "spread" in row.extra && (
                  <span className="tnum">
                    écart {row.extra.spread > 0 ? "+" : ""}
                    {row.extra.spread.toFixed(1)} · total {row.extra.total.toFixed(0)}
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
              <h3 className="font-bold">Aucun match exploitable</h3>
              <p className="max-w-[62ch] text-sm leading-relaxed text-muted">
                Soit le calendrier est vide, soit les équipes annoncées ne correspondent à aucune
                équipe apprise par les modèles. Vérifie que l&apos;historique de la compétition est
                bien importé.
              </p>
              <Link href="/sports" className="text-sm font-semibold text-edge underline">
                Revenir aux modèles
              </Link>
            </CardContent>
          </Card>
        </li>
      )}
    </ul>
  );
}
