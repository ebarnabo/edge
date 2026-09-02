"use client";

import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { CompetitionCarousel } from "@/components/sports/competition-carousel";
import { CompetitionLogo } from "@/components/sports/competition-logo";
import { COMPETITIONS, sortedCompetitionCodes } from "@/lib/sports/labels";
import { cn } from "@/lib/utils";

export function CompetitionFilter({
  codes,
  active,
  onSelect,
}: {
  codes: string[];
  active: string | null;
  /** Si fourni, filtre instantané sans rechargement de page */
  onSelect?: (code: string | null) => void;
}) {
  const searchParams = useSearchParams();

  const hrefFor = (code: string | null): Route => {
    const params = new URLSearchParams(searchParams.toString());
    if (code) params.set("c", code);
    else params.delete("c");
    const q = params.toString();
    return (q ? `/sports/scan?${q}` : "/sports/scan") as Route;
  };

  if (onSelect) {
    const items = [
      { code: null as string | null, label: "Toutes" },
      ...sortedCompetitionCodes(codes).map((code) => ({
        code,
        label: COMPETITIONS[code]?.label ?? code,
      })),
    ];
    return (
      <div className="flex flex-col gap-3">
        <span className="text-label flex items-center gap-1.5">
          <Trophy className="size-3.5 opacity-70" aria-hidden />
          Compétition
        </span>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item.code ?? "all"}
              type="button"
              onClick={() => onSelect(item.code)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-semibold transition-colors",
                active === item.code
                  ? "border-accent/30 bg-accent-soft text-accent"
                  : "border-line bg-surface text-muted hover:bg-hover hover:text-ink",
              )}
            >
              {item.code ? <CompetitionLogo code={item.code} size="sm" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const items = [
    { id: "all", href: hrefFor(null), title: "Toutes", selected: !active },
    ...sortedCompetitionCodes(codes).map((code) => {
      const info = COMPETITIONS[code];
      return {
        id: code,
        code,
        href: hrefFor(code),
        flag: info?.flag,
        title: info?.label ?? code,
        selected: active === code,
      };
    }),
  ];

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label flex items-center gap-1.5">
        <Trophy className="size-3.5 opacity-70" aria-hidden />
        Compétition
      </span>
      <CompetitionCarousel items={items} compact />
    </div>
  );
}
