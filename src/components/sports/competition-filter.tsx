"use client";

import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { CompetitionCarousel } from "@/components/sports/competition-carousel";
import { COMPETITIONS, sortedCompetitionCodes } from "@/lib/sports/labels";

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

  const items = [
    {
      id: "all",
      href: hrefFor(null),
      title: "Toutes",
      selected: !active,
    },
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
