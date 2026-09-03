/** Fond mesh — gradient animé en light, ambiance statique en dark. */
export function MeshBackground() {
  return (
    <div aria-hidden className="mesh-background pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="mesh-blob mesh-blob-a" />
      <div className="mesh-blob mesh-blob-b" />
      <div className="mesh-blob mesh-blob-c" />
      <div className="mesh-blob mesh-blob-d" />
      <div className="mesh-ambient mesh-ambient-a" />
      <div className="mesh-ambient mesh-ambient-b" />
      <div className="mesh-noise" />
      <div className="mesh-vignette" />
      <div className="mesh-dark-dots" />
    </div>
  );
}
