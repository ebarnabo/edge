"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/shell/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-card)] px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-hover hover:text-ink",
        className,
      )}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {theme === "dark" ? (
        <Sun className="size-[18px]" strokeWidth={1.75} />
      ) : (
        <Moon className="size-[18px]" strokeWidth={1.75} />
      )}
      <span className="hidden xl:inline">{theme === "dark" ? "Clair" : "Sombre"}</span>
    </button>
  );
}
