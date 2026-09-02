"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "bg-ink text-base hover:bg-ink/90",
        edge: "bg-edge text-base hover:bg-edge/90",
        outline: "border border-line bg-raised text-ink hover:border-line hover:bg-subtle",
        ghost: "text-muted hover:bg-raised hover:text-ink",
      },
      size: {
        sm: "h-8 px-4 text-xs",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-7 text-sm",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof button> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}
