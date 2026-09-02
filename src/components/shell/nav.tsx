"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Dices, Gauge, LineChart, Wallet } from "lucide-react";
import { MobileDock } from "@/components/shell/mobile-dock";
import { ThemeToggle } from "@/components/shell/theme-toggle";
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

  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/sports") return pathname === "/sports";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Sidebar desktop */}
      <nav className="glass-surface fixed top-0 left-0 hidden h-dvh w-[240px] flex-col border-r border-line bg-sidebar p-3 lg:flex">
        <Link href="/" className="mb-4 flex items-center gap-2 rounded-[var(--radius-card)] px-2 py-2 hover:bg-hover">
          <span className="flex size-7 items-center justify-center rounded-[var(--radius-card)] bg-accent text-xs font-bold text-white">
            E
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-ink">Edge</span>
            <span className="text-[11px] text-faint">Probabilités</span>
          </div>
        </Link>

        <ul className="flex flex-col gap-0.5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-card)] px-2.5 py-1.5 text-sm transition-colors",
                  active(href)
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-hover hover:text-ink",
                )}
              >
                <Icon className="size-[18px] shrink-0 opacity-80" strokeWidth={1.75} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-2 px-1">
          <div className="flex items-center gap-2 px-0.5">
            <ThemeToggle />
            <span className="text-xs text-muted">Thème</span>
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-faint">
            Jeu responsable · joueurs-info-service.fr · 09 74 75 13 13
          </p>
        </div>
      </nav>

      {/* Toggle thème mobile — hors dock pour la transition circulaire */}
      <div className="fixed top-3 right-3 z-50 lg:hidden">
        <ThemeToggle className="glass-surface border border-line bg-surface shadow-sm" />
      </div>

      <MobileDock />
    </>
  );
}
