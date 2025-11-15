export function ListHeaderPlaceholder() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {/* Icon placeholder */}
        <div className="w-8 h-8 bg-white/10 rounded shrink-0 relative overflow-hidden">
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

        <div className="flex-1 space-y-2">
          {/* Title placeholder */}
          <div className="h-9 md:h-10 bg-white/15 rounded w-2/3 max-w-md relative overflow-hidden">
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

          {/* List type label placeholder */}
          <div className="h-4 bg-white/10 rounded w-32 relative overflow-hidden">
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

      {/* Description placeholder (optional, so 50% chance it appears) */}
      <div className="space-y-2">
        <div className="h-5 bg-white/10 rounded w-full max-w-2xl relative overflow-hidden">
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
        <div className="h-5 bg-white/10 rounded w-3/4 max-w-xl relative overflow-hidden">
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
