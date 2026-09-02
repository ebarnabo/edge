"use client";

import Image from "next/image";
import { useState } from "react";
import { COMPETITIONS } from "@/lib/sports/labels";
import { cn } from "@/lib/utils";

export function getCompetitionLogo(code: string | null | undefined): string | null {
  if (!code) return null;
  return COMPETITIONS[code]?.logo ?? null;
}

export function CompetitionLogo({
  code,
  size = "md",
  className,
  title,
}: {
  code?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const info = code ? COMPETITIONS[code] : null;
  const logo = info?.logo;
  const [failed, setFailed] = useState(false);

  const px = { sm: 18, md: 24, lg: 32 }[size];
  const label = title ?? info?.label ?? code ?? "Compétition";

  if (!logo || failed) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
        style={{ fontSize: px * 0.85 }}
        aria-hidden
      >
        {info?.flag ?? "⚽"}
      </span>
    );
  }

  return (
    <Image
      src={logo}
      alt=""
      width={px}
      height={px}
      className={cn("shrink-0 object-contain", className)}
      title={label}
      onError={() => setFailed(true)}
      unoptimized={logo.endsWith(".svg")}
    />
  );
}
