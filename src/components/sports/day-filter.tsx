"use client";

import { Calendar, CalendarClock, CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDayChip, type DayFilter } from "@/lib/sports/filter-rows";

const PRESETS: { id: DayFilter; label: string; icon: typeof Calendar }[] = [
  { id: "all", label: "Tous les jours", icon: CalendarRange },
  { id: "today", label: "Aujourd'hui", icon: Calendar },
  { id: "tomorrow", label: "Demain", icon: CalendarClock },
  { id: "week", label: "7 prochains jours", icon: CalendarDays },
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
  const chipClass = (selected: boolean) => cn("chip", selected && "chip-active");

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label flex items-center gap-1.5">
        <Calendar className="size-3.5 opacity-70" aria-hidden />
        Jour
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={chipClass(active === p.id)}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {p.label}
          </button>
          );
        })}
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
