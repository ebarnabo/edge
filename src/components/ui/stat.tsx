"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  animateValue,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "edge" | "accent" | "warn" | "loto";
  icon?: LucideIcon;
  /** Si défini, anime le chiffre avec NumberTicker */
  animateValue?: number;
  className?: string;
}) {
  const toneClass = {
    default: "text-ink",
    edge: "text-accent",
    accent: "text-accent",
    warn: "text-warn",
    loto: "text-loto",
  }[tone];

  const showBeam = tone === "accent" && animateValue !== undefined && animateValue > 0;

  return (
    <div className={cn("relative flex flex-col gap-1 overflow-hidden rounded-[var(--radius-card)] p-3", className)}>
      {showBeam ? (
        <BorderBeam size={80} duration={7} colorFrom="#529cca" colorTo="#14b8a6" borderWidth={1} />
      ) : null}
      <span className="text-label flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden /> : null}
        {label}
      </span>
      <span className={cn("tnum text-2xl font-semibold tracking-tight", toneClass)}>
        {animateValue !== undefined ? <AnimatedNumber value={animateValue} /> : value}
      </span>
      {hint ? <span className="max-w-[34ch] text-sm leading-relaxed text-muted">{hint}</span> : null}
    </div>
  );
}
