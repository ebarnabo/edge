"use client";

import { DotPattern } from "@/components/ui/dot-pattern";

/** Fond mesh animé — gradient fluide light, dark sobre avec points lumineux. */
export function MeshBackground() {
  return (
    <div aria-hidden className="mesh-background pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="mesh-blob mesh-blob-a" />
      <div className="mesh-blob mesh-blob-b" />
      <div className="mesh-blob mesh-blob-c" />
      <div className="mesh-blob mesh-blob-d" />
      <div className="mesh-noise" />
      <div className="mesh-vignette" />
      <div className="absolute inset-0 hidden dark:block">
        <DotPattern
          width={20}
          height={20}
          cr={0.8}
          glow
          className="text-accent/25 opacity-70 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,#000_20%,transparent_75%)]"
        />
      </div>
    </div>
  );
}
