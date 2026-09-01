"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Stat } from "@/components/ui/stat";
import { expectedValue, LOTO_FIXED_PRIZES } from "@/lib/loto/probability";
import type { GameConfig } from "@/lib/fdj/games";
import { eur, num, pct } from "@/lib/utils";

export function EvPanel({ game }: { game: GameConfig }) {
  const [jackpot, setJackpot] = useState(3_000_000);
  const [tickets, setTickets] = useState(9_000_000);
  const [grids, setGrids] = useState(2);

  const ev = useMemo(
    () =>
      expectedValue({
        game,
        jackpot,
        ticketsSold: tickets,
        fixedPrizes: LOTO_FIXED_PRIZES,
      }),
    [game, jackpot, tickets],
  );

  const weekly = grids * game.price * game.drawDays.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ce que rapporte une grille</CardTitle>
        <CardDescription>
          L&apos;espérance est le gain moyen par grille sur un très grand nombre de tirages. Le
          partage du rang 1 est modélisé par une loi de Poisson sur le nombre d&apos;autres
          gagnants ayant joué la même combinaison.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-8 pt-6">
        <div className="flex flex-col gap-6">
          <Field
            label="Jackpot annoncé"
            value={eur(jackpot, 0)}
            min={2_000_000}
            max={250_000_000}
            step={1_000_000}
            current={jackpot}
            onChange={setJackpot}
          />
          <Field
            label="Grilles jouées sur le tirage"
            value={num(tickets)}
            min={1_000_000}
            max={80_000_000}
            step={500_000}
            current={tickets}
            onChange={setTickets}
          />
          <Field
            label="Grilles que tu joues"
            value={String(grids)}
            min={1}
            max={20}
            step={1}
            current={grids}
            onChange={setGrids}
          />
        </div>

        <div className="grid gap-8 border-t border-line/60 pt-8 sm:grid-cols-2">
          <Stat
            label="Espérance par grille"
            value={eur(ev.expectedReturn)}
            tone={ev.edge >= 0 ? "edge" : "warn"}
            hint={`Pour ${eur(game.price)} misés, soit un retour de ${pct(ev.effectiveTrj)}.`}
          />
          <Stat
            label="Perte moyenne par grille"
            value={eur(ev.edge)}
            tone={ev.edge >= 0 ? "edge" : "warn"}
          />
          <Stat
            label="Jackpot d'équilibre"
            value={eur(ev.breakEvenJackpot, 0)}
            hint="Niveau à partir duquel l'espérance devient positive, partage compris. Le jackpot dépasse rarement ce seuil."
          />
          <Stat
            label="Coût sur un an"
            value={eur(weekly * 52, 0)}
            tone="warn"
            hint={`${grids} grille${grids > 1 ? "s" : ""} par tirage, ${game.drawDays.length} tirages par semaine. Perte attendue : ${eur(-ev.edge * grids * game.drawDays.length * 52, 0)}.`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-sm text-muted">{label}</label>
        <span className="tnum text-sm font-bold">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[current]}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
    </div>
  );
}
