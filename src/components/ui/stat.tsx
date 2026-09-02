import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "edge" | "accent" | "warn" | "loto";
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
      <span className="text-label">{label}</span>
      <span className={cn("tnum text-2xl font-semibold tracking-tight", toneClass)}>{value}</span>
      {hint ? <span className="max-w-[34ch] text-sm leading-relaxed text-muted">{hint}</span> : null}
    </div>
  );
}
