"use client";

/** Fond mesh animé — gradient fluide light/dark, respecte reduced-motion. */
export function MeshBackground() {
  return (
    <div aria-hidden className="mesh-background pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="mesh-blob mesh-blob-a" />
      <div className="mesh-blob mesh-blob-b" />
      <div className="mesh-blob mesh-blob-c" />
      <div className="mesh-blob mesh-blob-d" />
      <div className="mesh-noise" />
      <div className="mesh-vignette" />
    </div>
  );
}
