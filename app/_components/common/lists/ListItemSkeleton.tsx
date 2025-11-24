interface ListItemSkeletonProps {
  index?: number;
}

export function ListItemSkeleton({ index = 0 }: ListItemSkeletonProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-list-item-background border border-white/10 min-h-[100px] flex">
      {/* Glare animation overlay */}
      <div
        className="absolute inset-0 animate-glare pointer-events-none z-20"
        style={{
          background: `linear-gradient(-45deg,
            transparent 40%,
            var(--color-glare) 45%,
            var(--color-glare) 55%,
            transparent 60%)`,
          backgroundSize: "200% 200%",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Image placeholder - matches w-44 from ListItem */}
      <div className="hidden md:block relative w-44 shrink-0 bg-white/5 border-r border-white/5" />

      {/* Content placeholder */}
      <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
        {/* Leading Content (Index) */}
        <div className="w-8 h-4 bg-white/10 rounded shrink-0" />

        {/* Text Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Title */}
          <div className="h-5 bg-white/15 rounded w-3/4" style={{ width: `${60 + (index % 4) * 10}%` }} />

          {/* Description lines */}
          <div className="space-y-2">
            <div className="h-3 bg-white/10 rounded w-1/2" />
            <div className="h-3 bg-white/10 rounded w-1/3" />
          </div>
        </div>

        {/* Trailing Content (Buttons) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-white/10 rounded" />
          <div className="w-24 h-8 bg-white/10 rounded" />
          <div className="w-8 h-8 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}
