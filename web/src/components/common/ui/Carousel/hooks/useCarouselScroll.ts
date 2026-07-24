import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
  type WheelEvent,
} from "react";

interface UseCarouselScrollOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  totalItems: number;
  itemsPerView?: number;
  targetCardWidth?: number;
  gap?: number;
}

export function useCarouselScroll({
  containerRef,
  totalItems,
  itemsPerView,
  targetCardWidth = 250,
  gap = 16,
}: UseCarouselScrollOptions) {
  const [visibleItems, setVisibleItems] = useState(itemsPerView || 4);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setCanScrollPrevious(container.scrollLeft > 2);
    setCanScrollNext(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 2,
    );
  }, [containerRef]);

  useEffect(() => {
    const calculate = () => {
      const width = window.innerWidth;
      if (itemsPerView !== undefined) {
        setVisibleItems(
          width < 768 ? Math.min(2, itemsPerView) : itemsPerView,
        );
      } else {
        const horizontalPadding = width < 768 ? 32 : 96;
        const availableWidth = width - horizontalPadding;
        const calculatedItems = Math.floor(
          (availableWidth + gap) / (targetCardWidth + gap),
        );
        setVisibleItems(Math.max(2, Math.min(calculatedItems, 10)));
      }
      requestAnimationFrame(updateScrollState);
    };

    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, [gap, itemsPerView, targetCardWidth, updateScrollState]);

  useEffect(() => {
    requestAnimationFrame(updateScrollState);
  }, [totalItems, updateScrollState, visibleItems]);

  const scroll = useCallback(
    (direction: -1 | 1) => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollBy({
        left: direction * container.clientWidth * 0.85,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    [containerRef],
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container || container.contains(event.target as Node)) return;

      const horizontalDelta =
        event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (
        horizontalDelta === 0 ||
        Math.abs(horizontalDelta) <= Math.abs(event.deltaY)
      ) {
        return;
      }

      event.preventDefault();
      container.scrollLeft += horizontalDelta;
    },
    [containerRef],
  );

  return {
    canScrollNext,
    canScrollPrevious,
    visibleItems,
    handleNext: () => scroll(1),
    handlePrevious: () => scroll(-1),
    handleWheel,
    updateScrollState,
  };
}
