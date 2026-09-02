"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { groupCompetitions } from "@/lib/sports/labels";
import { cn } from "@/lib/utils";

export function CompetitionPicker({
  codes,
  active,
  basePath = "/sports",
}: {
  codes: string[];
  active: string;
  basePath?: string;
}) {
  const searchParams = useSearchParams();
  const groups = groupCompetitions(codes);

  const hrefFor = (code: string): Route => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("c", code);
    params.set("tab", "football");
    const q = params.toString();
    return `${basePath}?${q}` as Route;
  };

  if (!codes.length) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-label">Compétition</span>
          <p className="text-sm text-muted">Choisis un championnat pour charger son modèle et ses équipes.</p>
        </div>

        <div className="flex flex-col gap-5">
          {groups.map(({ country, items }) => (
            <div key={country} className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-muted">{country}</span>
              <div className="flex flex-wrap gap-2">
                {items.map(({ code, info }) => {
                  const selected = code === active;
                  return (
                    <Link
                      key={code}
                      href={hrefFor(code)}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-[14px] border px-3.5 py-2.5 text-sm font-semibold transition-colors",
                        selected
                          ? "border-edge/40 bg-edge/12 text-ink ring-1 ring-edge/30"
                          : "border-line/60 bg-subtle text-muted hover:border-line hover:text-ink",
                      )}
                    >
                      <span aria-hidden className="text-base leading-none">
                        {info.flag}
                      </span>
                      <span>{info.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
