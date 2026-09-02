"use client";

import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";

export function AnimatedNumber({
  value,
  decimalPlaces = 0,
  className,
  suffix,
}: {
  value: number;
  decimalPlaces?: number;
  className?: string;
  suffix?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-0.5", className)}>
      <NumberTicker value={value} decimalPlaces={decimalPlaces} />
      {suffix ? <span>{suffix}</span> : null}
    </span>
  );
}
