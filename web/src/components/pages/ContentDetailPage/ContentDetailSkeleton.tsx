import { COMPACT_BANNER_SIZE } from "@/components/common/media/BannerShell";

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
      <div className="mx-auto max-w-[1800px] pb-20 pt-30">
        <section className="-mt-30 mb-6 md:mb-10 relative z-0">
          <div className={`relative w-full overflow-hidden bg-white/5 md:rounded-2xl ${COMPACT_BANNER_SIZE}`}>
            <div className="absolute inset-0 animate-pulse bg-linear-to-b from-white/5 via-white/10 to-white/5" />
            <div className="absolute inset-x-0 bottom-8 md:bottom-10">
              <div className="space-y-4 px-4 md:px-8 lg:px-12">
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
          <div className="mt-8 w-full space-y-3 px-4 md:px-8 lg:px-12">
            <Pulse className="h-9 w-32" />
            <Pulse className="h-4 w-24" />
          </div>
        </section>

        <section className="mb-10">
          <div className="w-full space-y-4 px-4 md:px-8 lg:px-12">
            <Pulse className="h-7 w-40" />
            <div className="space-y-3">
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-11/12" />
              <Pulse className="h-4 w-9/12" />
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="w-full space-y-4 px-4 md:px-8 lg:px-12">
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
