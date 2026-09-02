"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { displayTeamName } from "@/lib/sports/display";
import { cn } from "@/lib/utils";

export function TeamPicker({
  label,
  value,
  onChange,
  options,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      if (exclude && o === exclude) return false;
      if (!q) return true;
      return o.toLowerCase().includes(q) || displayTeamName(o).toLowerCase().includes(q);
    });
  }, [options, query, exclude]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex flex-col gap-3">
      <span className="text-label">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 items-center justify-between gap-2 rounded-[14px] border border-line/60 bg-subtle px-4 text-left text-sm font-semibold text-ink"
      >
        <span className="truncate">{value ? displayTeamName(value) : "Choisir…"}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full z-20 mt-1 flex w-full flex-col gap-2 rounded-[14px] border border-line/60 bg-surface p-3 shadow-lg">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une équipe…"
              autoFocus
              className="h-10 w-full rounded-[10px] border border-line/60 bg-subtle pl-9 pr-3 text-sm text-ink placeholder:text-faint"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">Aucune équipe trouvée</li>
            )}
            {filtered.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full rounded-[10px] px-3 py-2 text-left text-sm transition-colors hover:bg-subtle",
                    o === value ? "bg-edge/12 font-semibold text-edge" : "text-ink",
                  )}
                >
                  {displayTeamName(o)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
