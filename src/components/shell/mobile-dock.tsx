"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { CalendarClock, Dices, Gauge, LineChart, Wallet, type LucideIcon } from "lucide-react";
import { Dock, DockIcon } from "@/components/ui/dock";
import { cn } from "@/lib/utils";

const LINKS: { href: Route; short: string; icon: LucideIcon }[] = [
  { href: "/", short: "Accueil", icon: Gauge },
  { href: "/loto", short: "Tirages", icon: Dices },
  { href: "/sports/scan", short: "Matchs", icon: CalendarClock },
  { href: "/sports", short: "Modèles", icon: LineChart },
  { href: "/budget", short: "Budget", icon: Wallet },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/sports") return pathname === "/sports";
  return pathname.startsWith(href);
}

export function MobileDock() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <Dock
        disableMagnification
        direction="bottom"
        className={cn(
          "glass-surface pointer-events-auto mt-0 h-[52px] gap-1 border-line bg-surface/90 px-2 shadow-md",
          "supports-backdrop-blur:bg-surface/75",
        )}
        iconSize={36}
      >
        {LINKS.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <DockIcon key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={short}
                className={cn(
                  "flex size-full flex-col items-center justify-center rounded-xl transition-colors",
                  active ? "text-accent" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              </Link>
            </DockIcon>
          );
        })}
      </Dock>
    </div>
  );
}
