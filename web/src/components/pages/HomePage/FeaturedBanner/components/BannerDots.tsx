interface BannerDotsProps {
  itemCount: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function BannerDots({
  itemCount,
  currentIndex,
  onIndexChange,
}: BannerDotsProps) {
  if (itemCount <= 1) {
    return null;
  }

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-8 z-20 flex gap-2">
      {Array.from({ length: itemCount }).map((_, i) => (
        <button
          key={`dot-${i}`}
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => onIndexChange(i)}
          className={`h-2.5 w-2.5 rounded-full transition-all ${
            i === currentIndex
              ? "bg-white scale-110"
              : "bg-white/50 hover:bg-white/80"
          }`}
        />
      ))}
    </div>
  );
}
