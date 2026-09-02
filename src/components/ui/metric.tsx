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
        "flex flex-col gap-2 rounded-[14px] border border-line/50 bg-subtle px-4 py-3.5",
        highlight && "border-edge/35 bg-edge/8",
        className,
      )}
    >
      <span className="text-label">{label}</span>
      <span
        className={cn(
          "tnum text-xl font-extrabold tracking-tight sm:text-2xl",
          highlight ? "text-edge" : "text-ink",
        )}
      >
        {value}
      </span>
      {hint && <span className="text-xs leading-relaxed text-muted">{hint}</span>}
    </div>
  );
}
