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
    <header className={cn("flex flex-col gap-4 border-b border-line/50 pb-8", className)}>
      {eyebrow && <span className="text-label">{eyebrow}</span>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {link && (
          <Link
            href={link.href}
            className="text-sm font-semibold text-edge underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        )}
      </div>
      {description && (
        <p className="max-w-[68ch] text-base leading-relaxed text-muted">{description}</p>
      )}
    </header>
  );
}
