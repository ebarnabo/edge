"use client";

import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { CompetitionCarousel } from "@/components/sports/competition-carousel";
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
        flag: COMPETITIONS[code]?.flag,
      })),
    ];
    return (
      <div className="flex flex-col gap-3">
        <span className="text-label">Compétition</span>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item.code ?? "all"}
              type="button"
              onClick={() => onSelect(item.code)}
              className={cn(
                "rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-semibold transition-colors",
                active === item.code
                  ? "border-edge/50 bg-edge/15 text-edge"
                  : "border-line/60 bg-subtle text-muted hover:border-line hover:text-ink",
              )}
            >
              {"flag" in item && item.flag ? `${item.flag} ` : ""}
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
        href: hrefFor(code),
        flag: info?.flag,
        title: info?.label ?? code,
        selected: active === code,
      };
    }),
  ];

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label">Compétition</span>
      <CompetitionCarousel items={items} compact />
    </div>
  );
}
