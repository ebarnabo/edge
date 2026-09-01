"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberField } from "./number-field";
import type { NumberStat } from "@/lib/loto/stats";
import type { GameConfig } from "@/lib/fdj/games";
import type { WheelResult } from "@/lib/loto/wheeling";
import { eur, num, pct } from "@/lib/utils";

export function WheelBuilder({ game, stats }: { game: GameConfig; stats: NumberStat[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [hits, setHits] = useState(4);
  const [guarantee, setGuarantee] = useState(3);
  const [result, setResult] = useState<WheelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (n: number) =>
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  const build = () =>
    start(async () => {
      setError(null);
      const res = await fetch("/api/loto/wheel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: selected, pick: game.main.pick, hits, guarantee }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Calcul impossible");
        setResult(null);
        return;
      }
      setResult(json as WheelResult);
    });

  const enough = selected.length > game.main.pick;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Système réducteur</CardTitle>
        <CardDescription>
          Jouer toutes les combinaisons de ta sélection coûte cher. Un système réducteur retient le
          plus petit nombre de grilles qui garantit encore un rang minimal. Le gain espéré par euro
          misé reste identique — c&apos;est la dépense qui baisse, pas le hasard qui plie.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-8 pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-muted">
              Sélection : <span className="tnum font-bold text-ink">{selected.length}</span> numéros
            </span>
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Tout effacer
              </Button>
            )}
          </div>
          <NumberField stats={stats} selected={selected} onToggle={toggle} max={24} />
        </div>

        <div className="grid gap-6 border-t border-line/60 pt-8 sm:grid-cols-2">
          <Choice
            label="Si j'ai autant de bons numéros"
            options={[3, 4, 5]}
            value={hits}
            onChange={(v) => {
              setHits(v);
              if (guarantee > v) setGuarantee(v);
            }}
          />
          <Choice
            label="Je veux au moins ce rang garanti"
            options={[2, 3, 4].filter((g) => g <= hits)}
            value={guarantee}
            onChange={setGuarantee}
          />
        </div>

        <Button variant="edge" size="lg" disabled={!enough || pending} onClick={build}>
          {pending ? "Calcul du recouvrement…" : "Calculer le système"}
        </Button>

        {error && <p className="text-sm text-warn">{error}</p>}

        {result && (
          <div className="flex flex-col gap-6 border-t border-line/60 pt-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="edge">{result.grids.length} grilles</Badge>
              <Badge>au lieu de {num(result.fullSystemSize)}</Badge>
              <Badge tone="loto">{pct(result.reduction)} de dépense en moins</Badge>
              {!result.covered && <Badge tone="warn">{result.uncovered} cas non couverts</Badge>}
            </div>

            <p className="max-w-[62ch] text-sm leading-relaxed text-muted">
              {eur(result.grids.length * game.price)} au lieu de{" "}
              {eur(result.fullSystemSize * game.price)}. Si {hits} de tes numéros sortent, au moins
              une grille en contient {guarantee}.
            </p>

            <ol className="grid gap-2 sm:grid-cols-2">
              {result.grids.map((grid, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-[18px] border border-line/60 bg-raised/40 px-4 py-3"
                >
                  <span className="tnum w-6 text-xs text-faint">{i + 1}</span>
                  <span className="tnum flex flex-wrap gap-2 text-sm font-bold">
                    {grid.map((n) => (
                      <span
                        key={n}
                        className="flex size-7 items-center justify-center rounded-full bg-loto/16 text-loto"
                      >
                        {n}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex gap-2">
        {options.map((o) => (
          <Button
            key={o}
            size="sm"
            variant={o === value ? "solid" : "outline"}
            onClick={() => onChange(o)}
            className="tnum flex-1"
          >
            {o}
          </Button>
        ))}
      </div>
    </div>
  );
}
