"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { summarise, type BudgetEntry } from "@/lib/loto/budget";
import { GAME_LIST } from "@/lib/fdj/games";
import { eur, pct } from "@/lib/utils";

const STORAGE = "edge:budget";

export function Tracker() {
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [cap, setCap] = useState(30);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    game: GAME_LIST[0].label,
    stake: "",
    won: "",
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setEntries(parsed.entries ?? []);
      setCap(parsed.cap ?? 30);
    } catch {
      /* stockage illisible : on repart à vide */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ entries, cap }));
  }, [entries, cap]);

  const summary = useMemo(() => summarise(entries, cap), [entries, cap]);

  const add = () => {
    const stake = Number(draft.stake.replace(",", "."));
    if (!Number.isFinite(stake) || stake <= 0) return;
    setEntries((prev) => [
      { date: draft.date, game: draft.game, stake, won: Number(draft.won.replace(",", ".")) || 0 },
      ...prev,
    ]);
    setDraft({ ...draft, stake: "", won: "" });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ce que le jeu te coûte vraiment</CardTitle>
          <CardDescription>
            Note chaque mise et chaque gain. Le retour constaté se compare directement au taux
            annoncé par l&apos;opérateur : au bout de quelques dizaines de tirages, l&apos;écart
            entre les deux devient l&apos;information la plus utile de cette application. Les
            données restent dans ton navigateur.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-8 pt-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Misé" value={eur(summary.staked)} />
            <Stat label="Gagné" value={eur(summary.won)} />
            <Stat label="Solde" value={eur(summary.net)} tone={summary.net >= 0 ? "edge" : "warn"} />
            <Stat
              label="Retour constaté"
              value={summary.staked > 0 ? pct(summary.realTrj) : "—"}
              hint="Le taux de retour annoncé au Loto est de 54,35 %."
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-line/60 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-4 text-sm text-muted">
                Plafond mensuel
                <input
                  inputMode="decimal"
                  value={cap}
                  onChange={(e) => setCap(Number(e.target.value) || 0)}
                  className="tnum h-11 w-24 rounded-[14px] border border-line/60 bg-subtle px-4 font-bold text-ink"
                />
                €
              </label>
              <Badge tone={summary.overCap ? "warn" : "edge"}>
                {summary.overCap
                  ? `Dépassé de ${eur(-summary.remaining)}`
                  : `${eur(summary.remaining)} restants ce mois-ci`}
              </Badge>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-raised"
              role="progressbar"
              aria-valuenow={Math.round(((cap - summary.remaining) / (cap || 1)) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={summary.overCap ? "h-full bg-warn" : "h-full bg-edge"}
                style={{
                  width: `${Math.min(100, Math.max(0, ((cap - summary.remaining) / (cap || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {entries.length > 2 && (
            <p className="max-w-[62ch] border-t border-line/60 pt-8 text-sm leading-relaxed text-muted">
              Au rythme actuel, ce poste représente{" "}
              <span className="font-bold text-warn">{eur(summary.yearlyProjection, 0)}</span> sur
              douze mois.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un tirage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Date" type="date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
            <label className="flex flex-col gap-3">
              <span className="text-label">Jeu</span>
              <select
                value={draft.game}
                onChange={(e) => setDraft({ ...draft, game: e.target.value })}
                className="h-12 rounded-[14px] border border-line/60 bg-subtle px-4 text-sm font-semibold text-ink"
              >
                {GAME_LIST.map((g) => (
                  <option key={g.id} className="bg-surface">
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Misé (€)" value={draft.stake} onChange={(v) => setDraft({ ...draft, stake: v })} />
            <Field label="Gagné (€)" value={draft.won} onChange={(v) => setDraft({ ...draft, won: v })} />
          </div>
          <Button variant="solid" onClick={add} className="self-start">
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            {entries.slice(0, 30).map((e, i) => (
              <div
                key={`${e.date}-${i}`}
                className="data-row"
              >
                <span className="text-sm">
                  <span className="tnum text-faint">
                    {new Date(e.date).toLocaleDateString("fr-FR")}
                  </span>{" "}
                  · {e.game}
                </span>
                <span className="tnum flex gap-5 text-sm">
                  <span className="text-muted">&minus;{eur(e.stake)}</span>
                  <span className={e.won > 0 ? "font-bold text-edge" : "text-faint"}>
                    +{eur(e.won)}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-label">{label}</span>
      <input
        type={type}
        inputMode={type === "date" ? undefined : "decimal"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="tnum h-12 rounded-[14px] border border-line/60 bg-subtle px-4 text-sm font-semibold text-ink placeholder:text-faint"
      />
    </label>
  );
}
