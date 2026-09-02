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
      <nav className="fixed top-0 left-0 hidden h-dvh w-60 flex-col gap-8 border-r border-line/60 bg-surface p-6 lg:flex xl:w-64 xl:p-8">
        <Link href="/" className="flex flex-col gap-1">
          <span className="text-xl font-extrabold tracking-tight text-ink">Edge</span>
          <span className="text-xs text-muted">Probabilités, pas pronostics</span>
        </Link>

        <ul className="flex flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active(href)
                    ? "bg-edge/12 text-ink ring-1 ring-edge/25"
                    : "text-muted hover:bg-subtle hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-auto text-xs leading-relaxed text-balance text-faint">
          Les jeux d&apos;argent comportent des risques. Aide et information sur
          joueurs-info-service.fr — 09 74 75 13 13.
        </p>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line/60 bg-surface lg:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch px-1 pt-1 pb-[max(6px,env(safe-area-inset-bottom))]">
          {LINKS.map(({ href, short, icon: Icon }) => (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-[12px] px-0.5 text-[10px] font-semibold transition-colors",
                  active(href) ? "bg-edge/12 text-ink" : "text-muted",
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                <span className="w-full truncate text-center">{short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
