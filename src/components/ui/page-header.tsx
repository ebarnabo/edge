import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  link,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  link?: { href: Route; label: string };
  className?: string;
}) {
  return (
    <header className={cn("mb-2 flex flex-col gap-3 pb-8", className)}>
      {eyebrow ? <span className="eyebrow-pill w-fit">{eyebrow}</span> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="max-w-[20ch] text-[2rem] font-bold leading-[1.1] tracking-tight text-balance text-ink sm:text-[2.35rem]">
          {title}
        </h1>
        {link ? (
          <Link
            href={link.href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline"
          >
            {link.label}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {description ? (
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted">{description}</p>
      ) : null}
      <div className="h-px w-full bg-linear-to-r from-line via-accent/30 to-transparent" aria-hidden />
    </header>
  );
}
