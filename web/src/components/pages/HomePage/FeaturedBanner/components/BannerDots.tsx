import { Pause, Play } from "lucide-react";

interface BannerDotsProps {
  itemCount: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPaused: boolean;
  pausedByUser: boolean;
  autoplayAvailable: boolean;
  onTogglePaused: () => void;
}

export function BannerDots({
  itemCount,
  currentIndex,
  onIndexChange,
  isPaused,
  pausedByUser,
  autoplayAvailable,
  onTogglePaused,
}: BannerDotsProps) {
  if (itemCount <= 1) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 md:bottom-6">
      <div
        role="tablist"
        aria-label="Featured content"
        className="flex items-center rounded-full bg-black/65 p-1"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            return;
          }
          event.preventDefault();
          const nextIndex =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? itemCount - 1
                : event.key === "ArrowLeft"
                  ? (currentIndex - 1 + itemCount) % itemCount
                  : (currentIndex + 1) % itemCount;
          onIndexChange(nextIndex);
          document.getElementById(`featured-tab-${nextIndex}`)?.focus();
        }}
      >
        {Array.from({ length: itemCount }).map((_, i) => (
          <button
            id={`featured-tab-${i}`}
            key={`dot-${i}`}
            type="button"
            role="tab"
            tabIndex={i === currentIndex ? 0 : -1}
            aria-selected={i === currentIndex}
            aria-controls="featured-slide"
            aria-label={`Show featured item ${i + 1} of ${itemCount}`}
            onClick={() => onIndexChange(i)}
            className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span
              className={`block h-2.5 rounded-full transition-[width,background-color] ${
                i === currentIndex ? "w-5 bg-white" : "w-2.5 bg-white/55"
              }`}
            />
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label={
          autoplayAvailable
            ? pausedByUser
              ? "Resume featured carousel"
              : "Pause featured carousel"
            : "Featured carousel autoplay disabled by motion preference"
        }
        aria-pressed={pausedByUser}
        onClick={onTogglePaused}
        disabled={!autoplayAvailable}
        className="flex size-11 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
      <span className="sr-only" aria-live="polite">
        {!autoplayAvailable
          ? "Featured carousel autoplay disabled"
          : pausedByUser
            ? "Featured carousel paused"
            : "Featured carousel playing"}
      </span>
    </div>
  );
}
