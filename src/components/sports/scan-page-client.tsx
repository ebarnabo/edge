"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ScanTable } from "@/components/sports/scan-table";
import { ScanFilters, type ScanFilterState } from "@/components/sports/scan-filters";
import { DayFilterBar } from "@/components/sports/day-filter";
import { CompetitionFilter } from "@/components/sports/competition-filter";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { FadeIn } from "@/components/motion/gsap-motion";
import { Clock, LayoutList, Receipt, Sparkles } from "lucide-react";
import { applyScanParams, type ScanRowBase } from "@/lib/sports/scan-types";
import { extractAvailableDates, processScanRows } from "@/lib/sports/filter-rows";
import { formatFreshness } from "@/lib/sports/display";
import { num } from "@/lib/utils";

const DEFAULT_STATE: ScanFilterState = {
  query: "",
  view: "all",
  sort: "faciles",
  minProb: 0,
  bankroll: 100,
  threshold: 0.03,
  competition: null,
  day: "all",
};

function ScanSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-[var(--radius-card)] border border-line bg-subtle"
        />
      ))}
    </div>
  );
}

function ScanPageInner({ competitionCodes }: { competitionCodes: string[] }) {
  const [baseRows, setBaseRows] = useState<ScanRowBase[] | null>(null);
  const [meta, setMeta] = useState<{
    fixturesUpdatedAt: string | null;
    oddsUpdatedAt: string | null;
    fromCache: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ScanFilterState>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sports/scan");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur de chargement");
        if (cancelled) return;
        setBaseRows(json.rows);
        setMeta({
          fixturesUpdatedAt: json.fixturesUpdatedAt,
          oddsUpdatedAt: json.oddsUpdatedAt,
          fromCache: json.fromCache,
        });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const valuedRows = useMemo(() => {
    if (!baseRows) return [];
    return applyScanParams(baseRows, {
      bankroll: filters.bankroll,
      threshold: filters.threshold,
    });
  }, [baseRows, filters.bankroll, filters.threshold]);

  const availableDates = useMemo(() => extractAvailableDates(valuedRows), [valuedRows]);

  const rows = useMemo(
    () =>
      processScanRows(valuedRows, {
        query: filters.query,
        view: filters.view,
        sort: filters.sort,
        minProb: filters.minProb,
        competition: filters.competition,
        day: filters.day,
      }),
    [valuedRows, filters],
  );

  const patchFilters = useCallback((patch: Partial<ScanFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const withOdds = rows.filter((r) => r.market).length;
  const opportunities = rows.filter((r) => r.bestEdge).length;

  const animKey = `${filters.day}-${filters.view}-${filters.sort}-${filters.competition}-${filters.query}-${rows.length}`;

  return (
    <div className="flex flex-col gap-8">
      <FadeIn>
        <PageHeader
          title="Matchs à venir"
          description="Repère les victoires les plus probables ou les écarts intéressants. Filtres instantanés, sans rechargement."
          link={{ href: "/sports", label: "Modèles et validation →" }}
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        <Card>
          <CardContent className="flex flex-col gap-6">
            <CompetitionFilter
              codes={competitionCodes}
              active={filters.competition}
              onSelect={(c) => patchFilters({ competition: c })}
            />

            <DayFilterBar
              active={filters.day}
              dates={availableDates}
              onChange={(day) => patchFilters({ day })}
            />

            <ScanFilters state={filters} onChange={patchFilters} />

            <div className="grid gap-3 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={LayoutList}
                label="Matchs affichés"
                value={loading ? "…" : num(rows.length)}
                animateValue={loading ? undefined : rows.length}
              />
              <Stat
                icon={Receipt}
                label="Avec cotes"
                value={loading ? "…" : num(withOdds)}
                animateValue={loading ? undefined : withOdds}
              />
              <Stat
                icon={Sparkles}
                label="Opportunités"
                value={loading ? "…" : num(opportunities)}
                animateValue={loading ? undefined : opportunities}
                tone={opportunities > 0 ? "accent" : "default"}
              />
              <Stat
                icon={Clock}
                label="Données"
                value={loading ? "…" : meta?.fromCache ? "Prêtes" : "Calculées"}
                hint={
                  meta
                    ? `Calendrier ${formatFreshness(meta.fixturesUpdatedAt)} · cotes ${formatFreshness(meta.oddsUpdatedAt)}`
                    : undefined
                }
              />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {error && (
        <EmptyState title="Impossible de charger les matchs" hint={error} command="npm run build:scan" />
      )}

      {loading && <ScanSkeleton />}

      {!loading && !error && rows.length === 0 && (
        <FadeIn>
          <EmptyState
            title="Aucun match pour ces critères"
            hint="Change le jour, baisse la probabilité minimum ou essaie « Paris faciles »."
          />
        </FadeIn>
      )}

      {!loading && !error && rows.length > 0 && (
        <FadeIn delay={0.12}>
          <ScanTable rows={rows} sortMode={filters.sort} animKey={animKey} />
        </FadeIn>
      )}
    </div>
  );
}

export function ScanPageClient({ competitionCodes }: { competitionCodes: string[] }) {
  return (
    <Suspense fallback={<ScanSkeleton />}>
      <ScanPageInner competitionCodes={competitionCodes} />
    </Suspense>
  );
}
