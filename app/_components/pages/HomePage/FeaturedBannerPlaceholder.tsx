export default function FeaturedBannerPlaceholder() {
  return (
    <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl">
      {/* Empty card background to mirror PlaceholderCard */}
      <div className="absolute inset-0 bg-empty-card" />

      {/* Glare animation overlay (same effect as PlaceholderCard) */}
      <div
        className="absolute inset-0 animate-glare"
        style={{
          background:
            "linear-gradient(-45deg, transparent 40%, var(--color-glare) 45%, var(--color-glare) 55%, transparent 60%)",
          backgroundSize: "200% 200%",
          backgroundRepeat: "no-repeat",
          pointerEvents: "none",
        }}
      />

      {/* Subtle container styling to match the blurred/soft look */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-lg" />

      {/* Overlay gradients to match FeaturedBanner */}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/50 to-transparent" />
      <div
        className="absolute inset-x-0 bottom-0 h-28 md:h-36"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--color-background-logged-in) 100%)",
        }}
      />

      {/* Content placeholders */}
      <div className="relative z-30 h-full flex items-end">
        <div className="w-full px-4 md:px-12 pb-16 md:pb-20">
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-white/25 rounded" />
            <div className="h-6 md:h-8 bg-white/25 rounded flex-1 max-w-[70%]" />
          </div>

          <div className="mt-2 md:mt-3 text-white/85 space-y-2 font-sans">
            <div className="h-3 md:h-4 bg-white/20 rounded w-1/3" />
            <div className="h-3 md:h-4 bg-white/20 rounded w-1/2" />
            <div className="h-3 md:h-4 bg-white/20 rounded w-2/5" />
            <div className="h-3 md:h-4 bg-white/20 rounded w-3/5" />
          </div>

          <div className="mt-3 md:mt-5 flex items-center gap-3">
            <div className="h-8 md:h-9 bg-white/90 rounded px-6 w-28" />
          </div>
        </div>
      </div>

      {/* Dots placeholder */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-8 z-20 flex gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-white/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-white/40" />
        <div className="h-2.5 w-2.5 rounded-full bg-white/40" />
      </div>
    </div>
  );
}


