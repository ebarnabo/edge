"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { COMPETITIONS } from "@/lib/sports/labels";
import { cn } from "@/lib/utils";

export function CompetitionFilter({
  codes,
  active,
}: {
  codes: string[];
  active: string | null;
}) {
  const searchParams = useSearchParams();

  const hrefFor = (code: string | null): Route => {
    const params = new URLSearchParams(searchParams.toString());
    if (code) params.set("c", code);
    else params.delete("c");
    const q = params.toString();
    return (q ? `/sports/scan?${q}` : "/sports/scan") as Route;
  };

  const sorted = [...codes].sort((a, b) => {
    const ca = COMPETITIONS[a]?.country ?? "";
    const cb = COMPETITIONS[b]?.country ?? "";
    if (ca !== cb) return ca.localeCompare(cb, "fr");
    return (COMPETITIONS[a]?.label ?? a).localeCompare(COMPETITIONS[b]?.label ?? "fr");
  });

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label">Filtrer par compétition</span>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip href={hrefFor(null)} selected={!active} label="Toutes" />
        {sorted.map((code) => {
          const info = COMPETITIONS[code];
          return (
            <FilterChip
              key={code}
              href={hrefFor(code)}
              selected={active === code}
              label={info ? `${info.flag} ${info.label}` : code}
            />
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  selected,
  label,
}: {
  href: Route;
  selected: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "shrink-0 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
        selected
          ? "border-edge/40 bg-edge/12 text-ink ring-1 ring-edge/30"
          : "border-line/60 bg-subtle text-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
