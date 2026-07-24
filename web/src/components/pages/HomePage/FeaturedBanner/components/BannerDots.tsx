import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerDotsProps {
  itemCount: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function BannerDots({
  itemCount,
  currentIndex,
  onIndexChange,
  onPrevious,
  onNext,
}: BannerDotsProps) {
  if (itemCount <= 1) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Show previous featured item"
        onClick={onPrevious}
        className="absolute left-2 top-[36%] z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:left-4 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      >
        <ChevronLeft aria-hidden="true" className="size-6" />
      </button>

      <div
        role="tablist"
        aria-label="Featured content"
        className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-full bg-black/65 p-1 md:bottom-6"
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
        aria-label="Show next featured item"
        onClick={onNext}
        className="absolute right-2 top-[36%] z-40 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:right-4 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      >
        <ChevronRight aria-hidden="true" className="size-6" />
      </button>
    </>
  );
}
