/**
 * Sprint 08 / T5 — Content Detail page skeleton.
 *
 * Dimensions mirror the real `ContentDetailPage` layout so swapping
 * one for the other does not shift the document (CLS budget = 0):
 *
 *   - Banner: `min-h-[70vh]` matching `ContentBanner`.
 *   - Rating strip: ~80 px tall.
 *   - About section: 3 lines × line-height 1.6 + heading.
 *   - Action row: matches the icon button strip on the real page.
 *
 * Renderable as a React Server Component (no hooks, no client APIs)
 * so it can be used both as a Suspense fallback and as the App
 * Router's `loading.tsx`.
 */
function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

export function ContentDetailSkeleton() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative w-full min-h-screen bg-background-logged-in"
      role="status"
      aria-label="Loading content"
    >
      <div className="pt-30 pb-20">
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          <div className="relative w-full min-h-[70vh] bg-white/5 overflow-hidden">
            <div className="absolute inset-0 animate-pulse bg-linear-to-b from-white/5 via-white/10 to-white/5" />
            <div className="absolute bottom-10 left-0 right-0">
              <div className="container mx-auto px-4 space-y-4">
                <Pulse className="h-4 w-24" />
                <Pulse className="h-12 w-3/4 max-w-2xl" />
                <Pulse className="h-4 w-1/2 max-w-md" />
                <div className="flex gap-3 pt-4">
                  <Pulse className="h-10 w-32" />
                  <Pulse className="h-10 w-32" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="container mx-auto px-4 mt-8 space-y-3">
            <Pulse className="h-9 w-32" />
            <Pulse className="h-4 w-24" />
          </div>
        </section>

        <section className="mb-10">
          <div className="container mx-auto px-4 space-y-4">
            <Pulse className="h-7 w-40" />
            <div className="space-y-3">
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-11/12" />
              <Pulse className="h-4 w-9/12" />
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="container mx-auto px-4 space-y-4">
            <Pulse className="h-7 w-32" />
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Pulse key={i} className="aspect-square w-full" />
              ))}
            </div>
          </div>
        </section>
      </div>

      <span className="sr-only">Loading content details…</span>
    </main>
  );
}
