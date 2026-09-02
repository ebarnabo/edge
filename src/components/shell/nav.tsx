"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Dices, Gauge, LineChart, Wallet } from "lucide-react";
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
      {/* Sidebar desktop — style Notion */}
      <nav className="fixed top-0 left-0 hidden h-dvh w-[240px] flex-col border-r border-line bg-sidebar p-3 lg:flex">
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

        <p className="mt-auto px-2 text-[11px] leading-relaxed text-faint">
          Jeu responsable · joueurs-info-service.fr · 09 74 75 13 13
        </p>
      </nav>

      {/* Barre mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface lg:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch px-1 pt-1 pb-[max(6px,env(safe-area-inset-bottom))]">
          {LINKS.map(({ href, short, icon: Icon }) => (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-card)] px-0.5 text-[10px] font-medium transition-colors",
                  active(href) ? "text-accent" : "text-faint",
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                <span className="w-full truncate text-center">{short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
