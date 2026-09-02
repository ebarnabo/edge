import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-[var(--radius-card)]",
      "border border-line bg-surface/80 glass-surface",
      "shadow-sm dark:border-line dark:bg-surface/60 dark:shadow-[0_-20px_80px_-20px_rgb(82_156_202_/_0.08)_inset]",
      className,
    )}
    {...props}
  >
    <div className="relative min-h-[5rem] flex-1">{background}</div>
    <div className="relative z-10 p-4">
      <div className="pointer-events-none flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-8">
        <Icon className="size-10 origin-left text-accent/80 transition-all duration-300 group-hover:scale-90" aria-hidden />
        <h3 className="text-lg font-semibold text-ink">{name}</h3>
        <p className="max-w-lg text-sm leading-relaxed text-muted">{description}</p>
      </div>

      <div className="pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 lg:hidden">
        <Button variant="link" asChild size="sm" className="pointer-events-auto h-auto p-0 text-accent">
          <Link href={href as Route}>
            {cta}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>

    <div className="pointer-events-none absolute bottom-0 hidden w-full translate-y-8 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
      <Button variant="link" asChild size="sm" className="pointer-events-auto h-auto p-0 text-accent">
        <Link href={href as Route}>
          {cta}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </Button>
    </div>

    <div className="pointer-events-none absolute inset-0 transition-colors duration-300 group-hover:bg-hover/30" />
  </div>
);

export { BentoCard, BentoGrid };
