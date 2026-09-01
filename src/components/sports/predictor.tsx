"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { eur, pct } from "@/lib/utils";

interface Props {
  sport: "football" | "nba";
  competition?: string;
  teams: string[];
}

interface Valued {
  label: string;
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

export function Predictor({ sport, competition, teams }: Props) {
  const [home, setHome] = useState(teams[0] ?? "");
  const [away, setAway] = useState(teams[1] ?? "");
  const [odds, setOdds] = useState({ home: "", draw: "", away: "" });
  const [bankroll, setBankroll] = useState("100");
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const football = sport === "football";
  const labels = football ? [home, "Match nul", away] : [home, away];

  const run = () =>
    start(async () => {
      setError(null);
      const res = await fetch("/api/sports/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, competition, home, away, odds, bankroll: Number(bankroll) || 100 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        setData(null);
        return;
      }
      setData(json);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prédiction d&apos;ensemble</CardTitle>
        <CardDescription>
          {football
            ? "Deux modèles regardent le match différemment : Dixon–Coles génère les buts, la régression logistique tranche l'issue à partir de la forme, de l'Elo, des confrontations directes et du calendrier. Leur mélange est celui qui minimisait la log-perte en validation."
            : "Elo pondéré par la marge et régression logistique sur la marge ajustée au calendrier, le repos et la forme. Le mélange est celui retenu par la validation."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-8 pt-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Select label="Domicile" value={home} onChange={setHome} options={teams} />
          <Select label="Extérieur" value={away} onChange={setAway} options={teams} />
        </div>

        <fieldset className="flex flex-col gap-4 border-t border-line/60 pt-8">
          <legend className="sr-only">Cotes du marché</legend>
          <p className="max-w-[64ch] text-sm leading-relaxed text-muted">
            Les cotes sont facultatives et n&apos;entrent pas dans la prédiction. Elles servent à
            situer le modèle face au marché, une fois la marge retirée par la méthode de Shin.
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Input label="Cote domicile" value={odds.home} onChange={(v) => setOdds({ ...odds, home: v })} />
            {football && (
              <Input label="Cote nul" value={odds.draw} onChange={(v) => setOdds({ ...odds, draw: v })} />
            )}
            <Input label="Cote extérieur" value={odds.away} onChange={(v) => setOdds({ ...odds, away: v })} />
            <Input label="Bankroll (€)" value={bankroll} onChange={setBankroll} />
          </div>
        </fieldset>

        <Button variant="edge" size="lg" disabled={pending || home === away} onClick={run}>
          {pending ? "Calcul de l'ensemble…" : "Calculer"}
        </Button>

        {error && <p className="text-sm text-warn">{error}</p>}

        {data && (
          <div className="flex flex-col gap-8 border-t border-line/60 pt-8">
            <div className={`grid gap-8 ${football ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {data.probs.map((p, i) => (
                <Stat
                  key={labels[i]}
                  label={labels[i]}
                  value={pct(p)}
                  tone={p === Math.max(...data.probs) ? "edge" : "default"}
                />
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-line/60 pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold">Accord entre modèles</h3>
                <Badge tone={data.confidence > 0.25 ? "edge" : "neutral"}>
                  Netteté {pct(data.confidence, 0)}
                </Badge>
              </div>
              <p className="max-w-[64ch] text-sm leading-relaxed text-muted">
                Quand les deux modèles divergent nettement, la prédiction repose sur un signal
                fragile. Un écart supérieur à dix points mérite de passer le match.
              </p>
              <ul className="flex flex-col gap-1">
                {data.byModel.map((m) => (
                  <li
                    key={m.name}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] px-4 py-3 odd:bg-raised/30"
                  >
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
              <div className="grid gap-8 border-t border-line/60 pt-8 sm:grid-cols-3">
                <Stat
                  label="Buts attendus"
                  value={`${data.goals.lambda.toFixed(2)} – ${data.goals.mu.toFixed(2)}`}
                />
                <Stat label="Plus de 2,5 buts" value={pct(data.goals.over25)} />
                <Stat label="Les deux marquent" value={pct(data.goals.bttsYes)} />
              </div>
            )}

            {data.nba && (
              <div className="grid gap-8 border-t border-line/60 pt-8 sm:grid-cols-2">
                <Stat
                  label="Écart attendu"
                  value={`${data.nba.spread > 0 ? "+" : ""}${data.nba.spread.toFixed(1)}`}
                  hint="Positif = avantage domicile."
                />
                <Stat label="Total attendu" value={data.nba.total.toFixed(1)} />
              </div>
            )}

            {data.goals && (
              <div className="flex flex-wrap gap-2">
                {data.goals.topScores.map((s) => (
                  <Badge key={s.score} className="tnum">
                    {s.score} · {pct(s.p, 1)}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-4 border-t border-line/60 pt-8">
              <h3 className="font-bold">Ce qui fait pencher le match</h3>
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
              <p className="text-xs leading-relaxed text-faint">
                À droite, ce qui favorise le domicile ; à gauche, l&apos;extérieur. Échelle en
                points de logit, comparable d&apos;un facteur à l&apos;autre.
              </p>
            </div>

            {data.value && (
              <div className="flex flex-col gap-4 border-t border-line/60 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="font-bold">Écart au marché</h3>
                  {data.margin !== null && (
                    <Badge tone="warn">Marge bookmaker {pct(data.margin)}</Badge>
                  )}
                </div>
                <ul className="flex flex-col gap-2">
                  {data.value.map((v) => (
                    <li
                      key={v.label}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line/60 bg-raised/40 px-5 py-4"
                    >
                      <span className="flex items-center gap-3">
                        <Badge
                          tone={v.verdict === "value" ? "edge" : v.verdict === "éviter" ? "warn" : "neutral"}
                        >
                          {v.verdict}
                        </Badge>
                        <span className="text-sm font-semibold">{v.label}</span>
                      </span>
                      <span className="tnum flex flex-wrap items-baseline gap-5 text-sm text-muted">
                        <span>cote juste {v.fairOdds.toFixed(2)}</span>
                        <span>
                          écart {v.edge > 0 ? "+" : ""}
                          {pct(v.edge)}
                        </span>
                        {v.verdict === "value" && (
                          <span className="font-bold text-edge">mise {eur(v.stake)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="max-w-[66ch] text-xs leading-relaxed text-faint">
                  Mises en Kelly fractionné à 25 %. Un écart positif dit que le modèle est plus
                  confiant que le marché, pas que le pari va passer. Compare l&apos;écart annoncé
                  ici à l&apos;apport mesuré en validation : si le modèle ne bat les fréquences de
                  base que de quelques pour cent, un écart de 2 % relève du bruit.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-sm text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-[18px] border border-line/70 bg-raised/50 px-4 text-sm font-semibold text-ink"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-sm text-muted">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="tnum h-12 rounded-[18px] border border-line/70 bg-raised/50 px-4 text-sm font-semibold text-ink placeholder:text-faint"
      />
    </label>
  );
}
