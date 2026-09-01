"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Slider } from "@/components/ui/slider";
import { NumberField } from "./number-field";
import type { NumberStat } from "@/lib/loto/stats";
import type { GameConfig } from "@/lib/fdj/games";
import { eur, num, pct } from "@/lib/utils";

interface Factor {
  label: string;
  multiplier: number;
  crowding: boolean;
  detail: string;
}

interface Score {
  ratio: number;
  factors: Factor[];
  expectedCoWinners: number;
  shareFactor: number;
  expectedTopPrize: number;
}

interface Grid {
  combo: number[];
  ratio: number;
  shareFactor: number;
}

export function PopularityPanel({ game, stats }: { game: GameConfig; stats: NumberStat[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [jackpot, setJackpot] = useState(5_000_000);
  const [tickets, setTickets] = useState(9_000_000);
  const [count, setCount] = useState(5);
  const [score, setScore] = useState<Score | null>(null);
  const [grids, setGrids] = useState<Grid[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pick = game.main.pick;
  const complete = selected.length === pick;

  const toggle = (n: number) =>
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  const call = (payload: Record<string, unknown>) =>
    fetch("/api/loto/popularity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: game.id, jackpot, ticketsSold: tickets, ...payload }),
    });

  const analyse = () =>
    start(async () => {
      setError(null);
      const res = await call({ combo: selected });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        setScore(null);
        return;
      }
      setScore(json);
    });

  const generate = () =>
    start(async () => {
      setError(null);
      const res = await call({ action: "generate", count, include: selected.slice(0, pick - 1) });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      setGrids(json.grids);
    });

  const gain = useMemo(() => {
    if (!score || !grids?.length) return null;
    return grids[0].shareFactor / score.shareFactor;
  }, [score, grids]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Éviter les combinaisons populaires</CardTitle>
        <CardDescription>
          Choisir une combinaison rare ne change aucune probabilité de gagner. Cela change ce
          qu&apos;on touche : le rang 1 se partage entre tous les gagnants, et les grilles sont
          loin d&apos;être jouées uniformément. C&apos;est le seul levier qui augmente réellement
          l&apos;espérance de gain d&apos;une grille.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-8 pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              Ta grille : <span className="tnum font-bold text-ink">{selected.length}</span> / {pick}
            </span>
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Effacer
              </Button>
            )}
          </div>
          <NumberField stats={stats} selected={selected} onToggle={toggle} max={pick} />
        </div>

        <div className="grid gap-6 border-t border-line/60 pt-8 sm:grid-cols-2">
          <Field label="Jackpot annoncé" display={eur(jackpot, 0)} min={2_000_000} max={250_000_000} step={1_000_000} value={jackpot} onChange={setJackpot} />
          <Field label="Grilles jouées sur le tirage" display={num(tickets)} min={1_000_000} max={80_000_000} step={500_000} value={tickets} onChange={setTickets} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="solid" disabled={!complete || pending} onClick={analyse} className="flex-1">
            {pending ? "Calcul…" : "Analyser ma grille"}
          </Button>
          <Button variant="edge" disabled={pending} onClick={generate} className="flex-1">
            Proposer {count} grilles rares
          </Button>
        </div>

        <Field label="Nombre de grilles à proposer" display={String(count)} min={1} max={20} step={1} value={count} onChange={setCount} />

        {error && <p className="text-sm text-warn">{error}</p>}

        {score && (
          <div className="flex flex-col gap-8 border-t border-line/60 pt-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Popularité"
                value={`×${score.ratio.toFixed(2)}`}
                tone={score.ratio > 1.5 ? "warn" : "edge"}
                hint={
                  score.ratio > 1.5
                    ? "Nettement plus jouée que la moyenne."
                    : "Moins jouée que la moyenne."
                }
              />
              <Stat label="Autres gagnants attendus" value={score.expectedCoWinners.toFixed(2)} />
              <Stat label="Part du rang 1" value={pct(score.shareFactor)} />
              <Stat
                label="Rang 1 après partage"
                value={eur(score.expectedTopPrize, 0)}
                tone={score.ratio > 1.5 ? "warn" : "edge"}
              />
            </div>

            {score.factors.length > 0 && (
              <ul className="flex flex-col gap-2">
                {score.factors.map((f) => (
                  <li
                    key={f.label}
                    className="flex flex-col gap-2 rounded-[20px] border border-line/60 bg-raised/30 px-5 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-bold">{f.label}</span>
                      <Badge tone={f.crowding ? "warn" : "edge"}>
                        {f.crowding ? "sur-joué" : "sous-joué"} ×{f.multiplier.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="max-w-[68ch] text-sm leading-relaxed text-muted">{f.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {grids && (
          <div className="flex flex-col gap-6 border-t border-line/60 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold">Grilles sous-jouées</h3>
              {gain && gain > 1.05 && (
                <Badge tone="edge">×{gain.toFixed(2)} sur le rang 1 face à ta grille</Badge>
              )}
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {grids.map((g, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line/60 bg-raised/40 px-4 py-3"
                >
                  <span className="tnum flex flex-wrap gap-2">
                    {g.combo.map((n) => (
                      <span
                        key={n}
                        className="flex size-8 items-center justify-center rounded-full bg-loto/16 text-sm font-bold text-loto"
                      >
                        {n}
                      </span>
                    ))}
                  </span>
                  <span className="tnum text-xs text-faint">
                    ×{g.ratio.toFixed(2)} · part {pct(g.shareFactor, 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="max-w-[70ch] border-t border-line/60 pt-8 text-xs leading-relaxed text-faint">
          FDJ ne publie pas la répartition réelle des grilles jouées. Les coefficients reprennent
          les régularités documentées dans la littérature sur les loteries — effet des dates,
          aversion aux suites, motifs de bulletin — et restent des ordres de grandeur. Ils sont
          exposés dans <span className="text-muted">src/lib/loto/popularity.ts</span> et se
          règlent si tu disposes de meilleures données.
        </p>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-sm text-muted">{label}</label>
        <span className="tnum text-sm font-bold">{display}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  );
}
