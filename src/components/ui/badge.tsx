import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "border border-line/60 bg-raised text-ink",
        edge: "border border-edge/30 bg-edge/15 text-edge",
        warn: "border border-warn/30 bg-warn/15 text-warn",
        loto: "border border-loto/30 bg-loto/15 text-loto",
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
