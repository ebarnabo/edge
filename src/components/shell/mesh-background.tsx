/** Fond mesh animé — gradient fluide en light, dark sobre (points CSS, sans JS). */
export function MeshBackground() {
  return (
    <div aria-hidden className="mesh-background pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="mesh-blob mesh-blob-a" />
      <div className="mesh-blob mesh-blob-b" />
      <div className="mesh-blob mesh-blob-c" />
      <div className="mesh-blob mesh-blob-d" />
      <div className="mesh-noise" />
      <div className="mesh-vignette" />
      <div className="mesh-dark-dots" />
    </div>
  );
}
