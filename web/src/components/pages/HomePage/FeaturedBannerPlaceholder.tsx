import { COMPACT_BANNER_SIZE } from "@/components/common/media/BannerShell";

export function FeaturedBannerPlaceholder() {
  return (
    <div className={`relative mb-6 w-full overflow-hidden rounded-none md:mb-10 md:rounded-2xl ${COMPACT_BANNER_SIZE}`}>
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
        className="absolute inset-x-0 bottom-0 h-20 md:h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--color-background-logged-in) 100%)",
        }}
      />

      {/* Content placeholders */}
      <div className="relative z-30 h-full flex items-end">
        <div className="w-full px-4 pb-14 md:px-12 md:pb-16">
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-white/25 rounded" />
            <div className="h-6 md:h-8 bg-white/25 rounded flex-1 max-w-[70%]" />
          </div>

          <div className="mt-2 space-y-2 font-sans text-white/85 md:mt-3">
            <div className="h-3 md:h-4 bg-white/20 rounded w-1/3" />
            <div className="h-3 md:h-4 bg-white/20 rounded w-1/2" />
          </div>

          <div className="mt-3 md:mt-5 flex items-center gap-3">
            <div className="h-8 md:h-9 bg-white/90 rounded px-6 w-28" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 z-20 h-12 w-52 -translate-x-1/2 rounded-full bg-black/45 md:bottom-4" />
    </div>
  );
}
