import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-raised text-muted",
        edge: "bg-edge/16 text-edge",
        warn: "bg-warn/16 text-warn",
        loto: "bg-loto/16 text-loto",
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
