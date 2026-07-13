/*
 * Skeleton de chargement (le dashboard peut attendre le fetch Yahoo).
 * L'animation pulse est neutralisée par la règle prefers-reduced-motion globale.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8" aria-label="Chargement…" role="status">
      <div className="space-y-3">
        <div className="h-3 w-48 bg-ink/8" />
        <div className="h-14 w-80 max-w-full bg-ink/10" />
        <div className="flex gap-10 border-t border-edge pt-4">
          <div className="h-10 w-24 bg-ink/8" />
          <div className="h-10 w-24 bg-ink/8" />
          <div className="h-10 w-24 bg-ink/8" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="h-80 border border-edge bg-surface" />
        <div className="h-80 border border-edge bg-surface" />
      </div>
      <div className="h-56 border border-edge bg-surface" />
    </div>
  );
}
