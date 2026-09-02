"use client";

import { FadeIn } from "./gsap-motion";

export function MotionPage({ children }: { children: React.ReactNode }) {
  return <FadeIn>{children}</FadeIn>;
}
