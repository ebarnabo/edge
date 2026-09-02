import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "edge" | "accent" | "warn" | "loto";
  icon?: LucideIcon;
  className?: string;
}) {
  const toneClass = {
    default: "text-ink",
    edge: "text-accent",
    accent: "text-accent",
    warn: "text-warn",
    loto: "text-loto",
  }[tone];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-label flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden /> : null}
        {label}
      </span>
      <span className={cn("tnum text-2xl font-semibold tracking-tight", toneClass)}>{value}</span>
      {hint ? <span className="max-w-[34ch] text-sm leading-relaxed text-muted">{hint}</span> : null}
    </div>
  );
}
