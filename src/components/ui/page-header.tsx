import Link from "next/link";
import type { Route } from "next";
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
    <header className={cn("mb-2 flex flex-col gap-2 pb-6", className)}>
      {eyebrow && <span className="text-label">{eyebrow}</span>}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-balance text-ink sm:text-[2.25rem]">
          {title}
        </h1>
        {link && (
          <Link
            href={link.href}
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            {link.label}
          </Link>
        )}
      </div>
      {description && (
        <p className="max-w-[68ch] text-[15px] leading-relaxed text-muted">{description}</p>
      )}
    </header>
  );
}
