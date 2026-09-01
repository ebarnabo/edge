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
  tone?: "default" | "edge" | "warn" | "loto";
  className?: string;
}) {
  const toneClass = {
    default: "text-ink",
    edge: "text-edge",
    warn: "text-warn",
    loto: "text-loto",
  }[tone];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm text-faint">{label}</span>
      <span className={cn("tnum text-3xl font-extrabold tracking-tight", toneClass)}>{value}</span>
      {hint ? <span className="max-w-[34ch] text-xs leading-relaxed text-muted">{hint}</span> : null}
    </div>
  );
}
