"use client";

import { useEffect, useState, useTransition } from "react";
import { BarChart3, Receipt, Sparkles, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamPicker } from "@/components/sports/team-picker";
import { displayTeamName } from "@/lib/sports/display";
import { eur, pct } from "@/lib/utils";

interface Props {
  sport: "football" | "nba";
  competition?: string;
  teams: string[];
  initialHome?: string;
  initialAway?: string;
}

interface Valued {
  label: string;
  modelProb: number;
  fairProb: number;
  odds: number;
  fairOdds: number;
  edge: number;
  stake: number;
  verdict: "value" | "neutre" | "éviter";
}

interface Result {
  probs: number[];
  byModel: { name: string; probs: number[] }[];
  drivers: { name: string; value: number; contribution: number }[];
  confidence: number;
  goals?: {
    lambda: number;
    mu: number;
    over25: number;
    bttsYes: number;
    topScores: { score: string; p: number }[];
  };
  nba?: { spread: number; total: number };
  value: Valued[] | null;
  margin: number | null;
}

const VERDICT_LABELS = {
  value: "Opportunité",
  neutre: "Aligné",
  éviter: "Surcôté",
} as const;

function favoriteIndex(probs: number[]): number {
  return probs.indexOf(Math.max(...probs));
}

function resolveTeam(name: string | undefined, teams: string[]): string {
  if (!name) return teams[0] ?? "";
  const lower = name.toLowerCase();
  return teams.find((t) => t.toLowerCase() === lower || displayTeamName(t).toLowerCase() === lower) ?? name;
}

export function Predictor({ sport, competition, teams, initialHome, initialAway }: Props) {
  const [home, setHome] = useState(() => resolveTeam(initialHome, teams));
  const [away, setAway] = useState(() => resolveTeam(initialAway, teams) || teams[1] || "");
  const [odds, setOdds] = useState({ home: "", draw: "", away: "" });
  const [bankroll, setBankroll] = useState("100");
  const [showOdds, setShowOdds] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const football = sport === "football";
  const labels = football ? [home, "Match nul", away] : [home, away];

  useEffect(() => {
    if (initialHome) setHome(resolveTeam(initialHome, teams));
    if (initialAway) setAway(resolveTeam(initialAway, teams));
  }, [initialHome, initialAway, teams]);

  const run = () =>
    start(async () => {
      setError(null);
      const res = await fetch("/api/sports/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          competition,
          home,
          away,
          odds: showOdds ? odds : {},
          bankroll: Number(bankroll) || 100,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        setData(null);
        return;
      }
      setData(json);
    });

  const bestValue = data?.value?.find((v) => v.verdict === "value") ?? null;
  const favIdx = data ? favoriteIndex(data.probs) : -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="size-5 shrink-0 text-accent" aria-hidden />
          Analyser un match
        </CardTitle>
        <CardDescription>
          Choisis deux équipes pour obtenir les probabilités estimées par le modèle. Tu peux
          optionnellement ajouter des cotes pour comparer au marché.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <TeamPicker label="Domicile" value={home} onChange={setHome} options={teams} exclude={away} />
          <TeamPicker label="Extérieur" value={away} onChange={setAway} options={teams} exclude={home} />
        </div>

        <div className="flex flex-col gap-4 rounded-[14px] border border-line/50 bg-subtle p-4">
          <button
            type="button"
            onClick={() => setShowOdds((v) => !v)}
            className="flex items-center justify-between gap-2 text-sm font-semibold text-ink"
          >
            <span className="inline-flex items-center gap-2">
              <Receipt className="size-4 shrink-0 opacity-70" aria-hidden />
              Comparer aux cotes du marché
            </span>
            <Badge tone={showOdds ? "edge" : "neutral"}>{showOdds ? "Activé" : "Optionnel"}</Badge>
          </button>
          {showOdds && (
            <>
              <p className="text-xs leading-relaxed text-muted">
                Saisis les cotes que tu vois chez ton bookmaker. Elles ne modifient pas la prédiction
                — elles servent uniquement à mesurer l&apos;écart avec le modèle.
              </p>
              <div className={`grid gap-4 ${football ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                <OddsInput label="Cote domicile" value={odds.home} onChange={(v) => setOdds({ ...odds, home: v })} />
                {football && (
                  <OddsInput label="Cote nul" value={odds.draw} onChange={(v) => setOdds({ ...odds, draw: v })} />
                )}
                <OddsInput label="Cote extérieur" value={odds.away} onChange={(v) => setOdds({ ...odds, away: v })} />
                <OddsInput label="Bankroll (€)" value={bankroll} onChange={setBankroll} />
              </div>
            </>
          )}
        </div>

        <Button variant="edge" size="lg" disabled={pending || home === away || !home || !away} onClick={run}>
          {pending ? "Analyse en cours…" : "Analyser le match"}
        </Button>

        {error && <p className="text-sm text-warn">{error}</p>}

        {data && (
          <div className="flex flex-col gap-6 border-t border-line/60 pt-6">
            {/* Verdict principal */}
            {bestValue ? (
              <div className="rounded-[14px] border border-edge/35 bg-edge/8 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-edge">
                  <Sparkles className="size-4 shrink-0" aria-hidden />
                  Opportunité détectée
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  Le modèle estime <strong>{displayTeamName(bestValue.label)}</strong> à{" "}
                  <strong>{pct(bestValue.modelProb, 0)}</strong>, le marché à{" "}
                  <strong>{pct(bestValue.fairProb, 0)}</strong> — avantage de{" "}
                  <strong className="text-edge">+{pct(bestValue.edge)}</strong>.
                </p>
                {bestValue.stake > 0 && (
                  <p className="mt-2 text-sm text-muted">
                    Mise suggérée <strong className="text-edge">{eur(bestValue.stake)}</strong> (Kelly
                    25 %)
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-[14px] border border-line/50 bg-subtle p-4">
                <p className="text-sm font-semibold text-ink">Avis du modèle</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Favori probable :{" "}
                  <strong className="text-ink">{displayTeamName(labels[favIdx])}</strong> à{" "}
                  <strong className="text-ink">{pct(data.probs[favIdx], 0)}</strong>
                  {data.value
                    ? " — pas d'écart significatif avec le marché."
                    : " — ajoute des cotes pour comparer au marché."}
                </p>
              </div>
            )}

            {/* Probabilités ou tableau comparatif */}
            {data.value ? (
              <div className="flex flex-col gap-3">
                <span className="text-label flex items-center gap-1.5">
                  <BarChart3 className="size-3.5 opacity-70" aria-hidden />
                  Modèle vs marché
                </span>
                <div className="overflow-x-auto rounded-[14px] border border-line/50">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-line/50 bg-raised/50 text-left">
                        <th className="px-4 py-2.5 font-semibold text-muted">Issue</th>
                        <th className="tnum px-4 py-2.5 font-semibold text-muted">Modèle</th>
                        <th className="tnum px-4 py-2.5 font-semibold text-muted">Marché</th>
                        <th className="tnum px-4 py-2.5 font-semibold text-muted">Écart</th>
                        <th className="px-4 py-2.5 font-semibold text-muted">Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.value.map((v, i) => (
                        <tr key={v.label} className="border-b border-line/30 last:border-0">
                          <td className="max-w-[140px] truncate px-4 py-3 font-medium text-ink">
                            {displayTeamName(v.label)}
                          </td>
                          <td className="tnum px-4 py-3 font-bold text-ink">{pct(data.probs[i], 0)}</td>
                          <td className="tnum px-4 py-3 text-muted">{pct(v.fairProb, 0)}</td>
                          <td
                            className={`tnum px-4 py-3 font-semibold ${
                              v.edge > 0.02 ? "text-edge" : v.edge < -0.02 ? "text-warn" : "text-muted"
                            }`}
                          >
                            {v.edge > 0 ? "+" : ""}
                            {pct(v.edge)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                v.verdict === "value" ? "edge" : v.verdict === "éviter" ? "warn" : "neutral"
                              }
                            >
                              {VERDICT_LABELS[v.verdict]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.margin !== null && (
                  <p className="text-xs text-muted">
                    Marge bookmaker moyenne : {pct(data.margin)} — retirée avant comparaison.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <span className="text-label">Probabilités du modèle</span>
                <div className={`grid gap-3 ${football ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  {data.probs.map((p, i) => (
                    <div
                      key={labels[i]}
                      className={`flex flex-col gap-1 rounded-[14px] border px-4 py-3 ${
                        i === favIdx ? "border-edge/35 bg-edge/8" : "border-line/50 bg-subtle"
                      }`}
                    >
                      <span className="truncate text-xs font-medium text-muted">
                        {displayTeamName(labels[i])}
                      </span>
                      <span className={`tnum text-xl font-extrabold ${i === favIdx ? "text-edge" : "text-ink"}`}>
                        {pct(p, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Détails techniques repliables */}
            <details className="group border-t border-line/50 pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
                Détails de l&apos;analyse
              </summary>
              <div className="mt-4 flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">Accord entre modèles</span>
                    <Badge tone={data.confidence > 0.25 ? "edge" : "neutral"}>
                      Confiance {pct(data.confidence, 0)}
                    </Badge>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {data.byModel.map((m) => (
                      <li key={m.name} className="data-row">
                        <span className="text-sm font-semibold">{m.name}</span>
                        <span className="tnum flex gap-5 text-sm text-muted">
                          {m.probs.map((p, i) => (
                            <span key={i}>{pct(p, 0)}</span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {data.goals && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <DetailStat
                      label="Buts attendus"
                      value={`${data.goals.lambda.toFixed(1)} – ${data.goals.mu.toFixed(1)}`}
                    />
                    <DetailStat label="Plus de 2,5 buts" value={pct(data.goals.over25, 0)} />
                    <DetailStat label="Les deux marquent" value={pct(data.goals.bttsYes, 0)} />
                  </div>
                )}

                {data.nba && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailStat
                      label="Écart attendu"
                      value={`${data.nba.spread > 0 ? "+" : ""}${data.nba.spread.toFixed(1)}`}
                    />
                    <DetailStat label="Total attendu" value={data.nba.total.toFixed(0)} />
                  </div>
                )}

                {data.goals && data.goals.topScores.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.goals.topScores.map((s) => (
                      <Badge key={s.score} className="tnum">
                        {s.score} · {pct(s.p, 1)}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <span className="text-sm font-semibold text-ink">Facteurs clés</span>
                  <ul className="flex flex-col gap-3">
                    {data.drivers.map((d) => {
                      const max = Math.max(...data.drivers.map((x) => Math.abs(x.contribution))) || 1;
                      const share = (Math.abs(d.contribution) / max) * 50;
                      return (
                        <li key={d.name} className="flex flex-col gap-2">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="text-sm">{d.name}</span>
                            <span className="tnum text-xs text-faint">
                              {d.contribution > 0 ? "+" : ""}
                              {d.contribution.toFixed(2)}
                            </span>
                          </div>
                          <span className="relative flex h-1.5 rounded-full bg-raised">
                            <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
                            <span
                              className={`absolute inset-y-0 rounded-full ${d.contribution > 0 ? "bg-edge" : "bg-warn"}`}
                              style={
                                d.contribution > 0
                                  ? { left: "50%", width: `${share}%` }
                                  : { right: "50%", width: `${share}%` }
                              }
                            />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-faint">
                    À droite = avantage domicile, à gauche = avantage extérieur.
                  </p>
                </div>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-line/50 bg-subtle px-4 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="tnum text-lg font-bold text-ink">{value}</span>
    </div>
  );
}

function OddsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-label">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="tnum h-11 rounded-[14px] border border-line/60 bg-subtle px-4 text-sm font-semibold text-ink placeholder:text-faint"
      />
    </label>
  );
}
