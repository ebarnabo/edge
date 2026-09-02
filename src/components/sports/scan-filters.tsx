"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { SortMode, ViewFilter } from "@/lib/sports/filter-rows";

const VIEWS: { id: ViewFilter; label: string; hint: string }[] = [
  { id: "all", label: "Tous", hint: "Tous les matchs" },
  { id: "faciles", label: "Paris faciles", hint: "Victoire estimée ≥ 60 %" },
  { id: "value", label: "Opportunités", hint: "Écart modèle > marché" },
  { id: "cotes", label: "Avec cotes", hint: "Comparaison marché disponible" },
];

const SORTS: { id: SortMode; label: string }[] = [
  { id: "faciles", label: "Plus probable" },
  { id: "opportunites", label: "Meilleur écart" },
  { id: "date", label: "Date" },
];

export interface ScanFilterState {
  query: string;
  view: ViewFilter;
  sort: SortMode;
  minProb: number;
  bankroll: number;
  threshold: number;
  competition: string | null;
}

export function ScanFilters({
  state,
  onChange,
}: {
  state: ScanFilterState;
  onChange: (patch: Partial<ScanFilterState>) => void;
}) {
  const [search, setSearch] = useState(state.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setSearch(state.query);
  }, [state.query]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ query: value }), 200);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-label">Rechercher une équipe</span>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="PSG, Real Madrid, Lakers…"
            className="h-12 w-full rounded-[14px] border border-line/60 bg-subtle pr-10 pl-11 text-sm font-medium text-ink placeholder:text-faint"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                onChange({ query: "" });
              }}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-raised hover:text-ink"
              aria-label="Effacer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label">Type de pari</span>
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              title={v.hint}
              onClick={() =>
                onChange({
                  view: v.id,
                  sort: v.id === "faciles" ? "faciles" : v.id === "value" ? "opportunites" : state.sort,
                })
              }
              className={cn(
                "rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold transition-colors",
                state.view === v.id
                  ? "border-edge/50 bg-edge/15 text-edge"
                  : "border-line/60 bg-subtle text-muted hover:border-line hover:text-ink",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-label">Probabilité minimum</span>
          <span className="tnum text-sm font-bold text-edge">{Math.round(state.minProb * 100)} %</span>
        </div>
        <Slider
          min={50}
          max={85}
          step={5}
          value={[Math.round(state.minProb * 100)]}
          onValueChange={([v]) => onChange({ minProb: v / 100 })}
        />
        <span className="text-xs text-muted">
          Affiche uniquement les matchs où le favori a au moins cette probabilité de victoire
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label">Trier par</span>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ sort: s.id })}
              className={cn(
                "rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold transition-colors",
                state.sort === s.id
                  ? "border-edge/50 bg-edge/15 text-edge"
                  : "border-line/60 bg-subtle text-muted hover:border-line hover:text-ink",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <details className="border-t border-line/50 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
          Options avancées (bankroll, seuil d&apos;écart)
        </summary>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-label">Bankroll (€)</span>
            <input
              type="number"
              min={10}
              step={10}
              value={state.bankroll}
              onChange={(e) => onChange({ bankroll: Math.max(10, Number(e.target.value) || 100) })}
              className="tnum h-11 rounded-[14px] border border-line/60 bg-subtle px-4 text-sm font-semibold text-ink"
            />
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-label">Seuil d&apos;écart</span>
              <span className="tnum text-sm font-bold text-edge">
                {Math.round(state.threshold * 100)} %
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[Math.round(state.threshold * 100)]}
              onValueChange={([v]) => onChange({ threshold: v / 100 })}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
