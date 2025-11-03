interface PlaceholderCardProps {
  index?: number;
  className?: string;
}

export default function PlaceholderCard({ index = 0, className = "" }: PlaceholderCardProps) {
  return (
    <div
      className={`w-full ${className}`}
      style={{ aspectRatio: "5 / 8" }}
    >
      <div className="relative overflow-hidden rounded-2xl h-full bg-white/5 backdrop-blur-lg">
        {/* Empty card background */}
        <div className="absolute inset-0 bg-empty-card" />

        {/* Glare animation overlay */}
        <div
          className="absolute inset-0 animate-glare"
          style={{
            background: `linear-gradient(-45deg,
              transparent 40%,
              var(--color-glare) 45%,
              var(--color-glare) 55%,
              transparent 60%)`,
            backgroundSize: "200% 200%",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t from-gray-700/80 via-gray-600/40 to-transparent" />

        {/* Content placeholder */}
        <div className="relative z-10 h-full flex flex-col">
          <div className="mt-auto w-full px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-5 space-y-2 md:space-y-4">
            {/* Icon and title placeholder */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded shrink-0" />
              <div className="h-4 md:h-6 bg-white/20 rounded flex-1" style={{ width: `${60 + (index % 3) * 20}%` }} />
            </div>

            {/* Footer placeholder lines */}
            <div className="flex flex-col gap-1.5">
              <div className="h-3 bg-white/15 rounded w-full" />
              <div className="h-3 bg-white/15 rounded" style={{ width: `${70 + (index % 2) * 15}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
