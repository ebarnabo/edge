"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Entrée en fondu + glissement pour une section de page. */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.55, delay, ease: "power3.out" },
    );
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Liste avec apparition décalée des éléments `[data-animate-item]`. */
export function StaggerList({
  children,
  className,
  resetKey,
}: {
  children: ReactNode;
  className?: string;
  /** Change pour relancer l'animation (ex. filtres) */
  resetKey?: string | number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const items = root.querySelectorAll("[data-animate-item]");
    if (!items.length) return;

    gsap.fromTo(
      items,
      { opacity: 0, y: 18, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.42,
        stagger: 0.055,
        ease: "power2.out",
        clearProps: "transform",
      },
    );
  }, [resetKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Compteur animé pour les stats. */
export function AnimatedStatValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
    );
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
