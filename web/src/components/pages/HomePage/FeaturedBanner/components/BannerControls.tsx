import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface BannerControlsProps {
  itemCount: number;
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  isPaused: boolean;
  canToggleAutoplay: boolean;
  onPauseToggle: () => void;
}

export function BannerControls({
  itemCount,
  currentIndex,
  onPrevious,
  onNext,
  isPaused,
  canToggleAutoplay,
  onPauseToggle,
}: BannerControlsProps) {
  if (itemCount <= 1) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Featured content controls"
      className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-full bg-black/70 p-1 text-white transition-opacity md:bottom-4 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        if (event.key === "ArrowLeft") {
          onPrevious();
        } else {
          onNext();
        }
      }}
    >
      <button
        type="button"
        aria-label="Show previous featured item"
        onClick={onPrevious}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,transform] hover:scale-105 hover:bg-white/15 active:scale-95 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>

      <span
        aria-live="polite"
        aria-atomic="true"
        className="min-w-12 text-center text-xs font-semibold tabular-nums text-white/80"
      >
        {currentIndex + 1} / {itemCount}
      </span>

      <button
        type="button"
        aria-label={isPaused ? "Resume featured content" : "Pause featured content"}
        aria-pressed={isPaused}
        disabled={!canToggleAutoplay}
        onClick={onPauseToggle}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,transform] hover:scale-105 hover:bg-white/15 active:scale-95 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:text-white/45 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100"
      >
        {isPaused ? (
          <Play aria-hidden="true" className="size-4 fill-current" />
        ) : (
          <Pause aria-hidden="true" className="size-4 fill-current" />
        )}
      </button>

      <button
        type="button"
        aria-label="Show next featured item"
        onClick={onNext}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,transform] hover:scale-105 hover:bg-white/15 active:scale-95 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
