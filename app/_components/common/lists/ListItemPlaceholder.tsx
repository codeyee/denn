interface ListItemPlaceholderProps {
  index?: number;
}

export function ListItemPlaceholder({ index = 0 }: ListItemPlaceholderProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-list-item-background border border-white/10 p-4">
      {/* Glare animation overlay */}
      <div
        className="absolute inset-0 animate-glare pointer-events-none"
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

      <div className="flex items-center gap-4 relative z-10">
        {/* Image placeholder */}
        <div className="w-12 h-16 sm:w-16 sm:h-20 bg-white/10 rounded shrink-0" />

        {/* Content placeholder */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <div className="h-5 bg-white/15 rounded" style={{ width: `${50 + (index % 4) * 15}%` }} />

          {/* Metadata lines */}
          <div className="space-y-1.5">
            <div className="h-3 bg-white/10 rounded" style={{ width: `${40 + (index % 3) * 10}%` }} />
            <div className="h-3 bg-white/10 rounded" style={{ width: `${30 + (index % 2) * 15}%` }} />
          </div>
        </div>

        {/* Action buttons placeholder */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-white/10 rounded" />
          <div className="w-8 h-8 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}
