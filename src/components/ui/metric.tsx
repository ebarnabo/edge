import { cn } from "@/lib/utils";

export function Metric({
  label,
  value,
  hint,
  highlight = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[var(--radius-card)] border border-line px-3 py-2.5",
        highlight ? "border-accent/30 bg-accent-soft" : "bg-subtle",
        className,
      )}
    >
      <span className="text-label">{label}</span>
      <span
        className={cn(
          "tnum text-lg font-semibold tracking-tight",
          highlight ? "text-accent" : "text-ink",
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs leading-relaxed text-muted">{hint}</span>}
    </div>
  );
}
