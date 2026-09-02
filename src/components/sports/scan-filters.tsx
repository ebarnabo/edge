"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ViewFilter } from "@/lib/sports/filter-rows";

const VIEWS: { id: ViewFilter; label: string; hint: string }[] = [
  { id: "all", label: "Tous", hint: "Tous les matchs analysés" },
  { id: "value", label: "Opportunités", hint: "Écart modèle > marché au-dessus du seuil" },
  { id: "favoris", label: "Favoris", hint: "Forte probabilité de victoire (≥ 55 %)" },
  { id: "cotes", label: "Avec cotes", hint: "Matchs confrontés au marché" },
];

export function ScanFilters({
  bankroll,
  threshold,
  view,
  query,
}: {
  bankroll: number;
  threshold: number;
  view: ViewFilter;
  query: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [localBankroll, setLocalBankroll] = useState(String(bankroll));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const q = params.toString();
      startTransition(() => {
        router.push((q ? `/sports/scan?${q}` : "/sports/scan") as Route);
      });
    },
    [router, searchParams],
  );

  useEffect(() => {
    setSearch(query);
  }, [query]);

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value || null }), 350);
  };

  const clearSearch = () => {
    setSearch("");
    navigate({ q: null });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Recherche */}
      <div className="flex flex-col gap-3">
        <span className="text-label">Rechercher un match</span>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Équipe, ex. PSG, Real Madrid, Lakers…"
            className={cn(
              "h-12 w-full rounded-[14px] border border-line/60 bg-subtle pr-10 pl-11 text-sm font-medium text-ink placeholder:text-faint",
              pending && "opacity-70",
            )}
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-raised hover:text-ink"
              aria-label="Effacer la recherche"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filtres rapides */}
      <div className="flex flex-col gap-3">
        <span className="text-label">Afficher</span>
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              title={v.hint}
              onClick={() => navigate({ vue: v.id === "all" ? null : v.id })}
              className={cn(
                "rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold transition-colors",
                view === v.id
                  ? "border-edge/50 bg-edge/15 text-edge"
                  : "border-line/60 bg-subtle text-muted hover:border-line hover:text-ink",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bankroll et seuil */}
      <div className="grid gap-6 border-t border-line/50 pt-6 sm:grid-cols-2">
        <label className="flex flex-col gap-3">
          <span className="text-label">Bankroll (€)</span>
          <input
            type="number"
            inputMode="decimal"
            min={10}
            step={10}
            value={localBankroll}
            onChange={(e) => setLocalBankroll(e.target.value)}
            onBlur={() => {
              const val = Math.max(10, Number(localBankroll) || 100);
              setLocalBankroll(String(val));
              navigate({ bankroll: val === 100 ? null : String(val) });
            }}
            className="tnum h-12 rounded-[14px] border border-line/60 bg-subtle px-4 text-sm font-semibold text-ink"
          />
          <span className="text-xs text-muted">Capital disponible pour les mises suggérées</span>
        </label>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label">Seuil d&apos;écart</span>
            <span className="tnum text-sm font-bold text-edge">{(threshold * 100).toFixed(0)} %</span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[threshold * 100]}
            onValueCommit={([v]) => navigate({ seuil: v === 3 ? null : String(v) })}
          />
          <span className="text-xs text-muted">
            Écart minimum modèle vs marché pour signaler une opportunité
          </span>
        </div>
      </div>
    </div>
  );
}
