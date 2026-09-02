"use client";

import { cn } from "@/lib/utils";
import { formatDayChip, type DayFilter } from "@/lib/sports/filter-rows";

const PRESETS: { id: DayFilter; label: string }[] = [
  { id: "all", label: "Tous les jours" },
  { id: "today", label: "Aujourd'hui" },
  { id: "tomorrow", label: "Demain" },
  { id: "week", label: "7 prochains jours" },
];

function datesWithoutPresets(dates: string[]): string[] {
  return dates.filter((d) => {
    const label = formatDayChip(d);
    return label !== "Aujourd'hui" && label !== "Demain";
  });
}

export function DayFilterBar({
  active,
  dates,
  onChange,
}: {
  active: DayFilter;
  dates: string[];
  onChange: (day: DayFilter) => void;
}) {
  const chipClass = (selected: boolean) =>
    cn(
      "shrink-0 rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors",
      selected
        ? "border-accent/30 bg-accent-soft text-accent"
        : "border-line bg-surface text-muted hover:bg-hover hover:text-ink",
    );

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label">Jour</span>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={chipClass(active === p.id)}
          >
            {p.label}
          </button>
        ))}
        {datesWithoutPresets(dates).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={chipClass(active === d)}
          >
            {formatDayChip(d)}
          </button>
        ))}
      </div>
    </div>
  );
}
