"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Dices, Gauge, LineChart, Wallet } from "lucide-react";
import { MobileDock } from "@/components/shell/mobile-dock";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Vue d'ensemble", short: "Accueil", icon: Gauge },
  { href: "/loto", label: "Tirages", short: "Tirages", icon: Dices },
  { href: "/sports/scan", label: "Matchs à venir", short: "Matchs", icon: CalendarClock },
  { href: "/sports", label: "Modèles sport", short: "Modèles", icon: LineChart },
  { href: "/budget", label: "Budget", short: "Budget", icon: Wallet },
] as const;

export function Nav() {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 1023px)");

  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/sports") return pathname === "/sports";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="glass-surface fixed top-0 left-0 hidden h-dvh w-[252px] flex-col border-r border-line bg-sidebar p-4 lg:flex">
        <Link
          href="/"
          className="mb-6 flex items-center gap-3 rounded-[var(--radius-card)] px-2 py-2 transition-colors hover:bg-hover"
        >
          <span className="flex size-9 items-center justify-center rounded-[var(--radius-card)] bg-linear-to-br from-accent to-euro text-sm font-bold text-white shadow-sm">
            E
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-ink">Edge</span>
            <span className="text-[11px] text-faint">Probabilités & modèles</span>
          </div>
        </Link>

        <ul className="flex flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cn(
                  "nav-active-indicator flex items-center gap-3 rounded-[var(--radius-card)] py-2 pr-3 pl-3 text-sm transition-colors",
                  active(href)
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-muted hover:bg-hover hover:text-ink",
                )}
              >
                <Icon className="size-[18px] shrink-0 opacity-85" strokeWidth={1.75} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-faint">Apparence</span>
            <ThemeToggle />
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-faint">
            Jeu responsable · joueurs-info-service.fr · 09 74 75 13 13
          </p>
        </div>
      </nav>

      {isMobile ? (
        <div className="fixed top-3 right-3 z-50">
          <ThemeToggle className="elevated border border-line bg-surface" />
        </div>
      ) : null}

      {isMobile ? <MobileDock /> : null}
    </>
  );
}
