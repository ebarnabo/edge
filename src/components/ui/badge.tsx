import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center justify-center gap-1 rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-subtle text-muted",
        edge: "bg-accent-soft text-accent",
        accent: "bg-accent-soft text-accent",
        warn: "bg-warn/10 text-warn",
        loto: "bg-loto/10 text-loto",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
