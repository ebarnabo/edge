"use client";

import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CompetitionCarousel } from "@/components/sports/competition-carousel";
import { COMPETITIONS, sortedCompetitionCodes } from "@/lib/sports/labels";

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

  const hrefFor = (code: string): Route => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("c", code);
    params.set("tab", "football");
    return `${basePath}?${params.toString()}` as Route;
  };

  if (!codes.length) return null;

  const items = sortedCompetitionCodes(codes).map((code) => {
    const info = COMPETITIONS[code] ?? { label: code, country: "Autre", flag: "⚽" };
    return {
      id: code,
      href: hrefFor(code),
      flag: info.flag,
      title: info.label,
      subtitle: info.country,
      selected: code === active,
    };
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 px-0.5">
          <span className="text-label">Championnat</span>
          <p className="text-sm text-muted">Fais défiler et sélectionne une compétition.</p>
        </div>
        <CompetitionCarousel items={items} />
      </CardContent>
    </Card>
  );
}
