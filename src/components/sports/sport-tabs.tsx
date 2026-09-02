"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { Activity, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function SportTabs({
  tab,
  football,
  nba,
}: {
  tab: "football" | "nba";
  football: React.ReactNode;
  nba: React.ReactNode;
}) {
  const searchParams = useSearchParams();

  const hrefFor = (next: "football" | "nba"): Route => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    const q = params.toString();
    return (q ? `/sports?${q}` : "/sports") as Route;
  };

  return (
    <Tabs value={tab}>
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="football" asChild>
          <Link href={hrefFor("football")} className={cn("inline-flex items-center gap-1.5", tab === "football" && "pointer-events-none")}>
            <Trophy className="size-3.5 shrink-0 opacity-80" aria-hidden />
            Football
          </Link>
        </TabsTrigger>
        <TabsTrigger value="nba" asChild>
          <Link href={hrefFor("nba")} className={cn("inline-flex items-center gap-1.5", tab === "nba" && "pointer-events-none")}>
            <Activity className="size-3.5 shrink-0 opacity-80" aria-hidden />
            NBA
          </Link>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="football" className="flex flex-col gap-6">
        {football}
      </TabsContent>

      <TabsContent value="nba" className="flex flex-col gap-6">
        {nba}
      </TabsContent>
    </Tabs>
  );
}
