export function ItemsHeaderPlaceholder() {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* "Items" title placeholder */}
        <div className="h-8 bg-white/15 rounded w-24 relative overflow-hidden">
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
        </div>

        {/* Item count placeholder */}
        <div className="h-4 bg-white/10 rounded w-16 relative overflow-hidden">
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
        </div>

        {/* Pagination controls placeholder */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <div className="h-7 w-16 bg-white/10 rounded relative overflow-hidden">
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
            </div>
            <div className="h-7 w-16 bg-white/10 rounded relative overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle placeholder */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
        <div className="h-8 w-20 bg-white/10 rounded relative overflow-hidden">
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
        </div>
        <div className="h-8 w-20 bg-white/10 rounded relative overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
