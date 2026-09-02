"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarouselItem {
  id: string;
  href: Route;
  flag?: string;
  title: string;
  subtitle?: string;
  selected: boolean;
}

export function CompetitionCarousel({
  items,
  compact = false,
  className,
}: {
  items: CarouselItem[];
  compact?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const active = el.querySelector<HTMLElement>('[aria-current="true"]');
    if (active) {
      const frame = requestAnimationFrame(() => {
        active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
      updateEdges();
      return () => cancelAnimationFrame(frame);
    }
    updateEdges();
  }, [items, updateEdges]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.55), behavior: "smooth" });
  };

  return (
    <div
      className={cn(
        "competition-carousel-wrap",
        atStart && "is-at-start",
        atEnd && "is-at-end",
        className,
      )}
    >
      {!atStart && (
        <button
          type="button"
          className="carousel-nav carousel-nav-left"
          aria-label="Compétitions précédentes"
          onClick={() => scroll(-1)}
        >
          <ChevronLeft />
        </button>
      )}

      <div ref={trackRef} className="competition-carousel-track" role="list">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            role="listitem"
            aria-current={item.selected ? "true" : undefined}
            className={cn(
              "competition-carousel-card",
              compact && "is-compact",
              item.selected && "is-selected",
            )}
          >
            {item.flag && (
              <span className="competition-carousel-flag" aria-hidden>
                {item.flag}
              </span>
            )}
            {!compact && item.subtitle && (
              <span className="competition-carousel-sub">{item.subtitle}</span>
            )}
            <span className="competition-carousel-title">{item.title}</span>
          </Link>
        ))}
      </div>

      {!atEnd && (
        <button
          type="button"
          className="carousel-nav carousel-nav-right"
          aria-label="Compétitions suivantes"
          onClick={() => scroll(1)}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
