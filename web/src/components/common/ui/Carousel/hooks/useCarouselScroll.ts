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
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    setHasOverflow(container.scrollWidth - container.clientWidth > 2);
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
      const maximumScroll = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const isAtStart = container.scrollLeft <= 2;
      const isAtEnd = container.scrollLeft >= maximumScroll - 2;
      const shouldWrap =
        (direction === -1 && isAtStart) || (direction === 1 && isAtEnd);
      const pageDistance = container.clientWidth * 0.85;
      const target = shouldWrap
        ? direction === -1
          ? maximumScroll
          : 0
        : Math.min(
            maximumScroll,
            Math.max(0, container.scrollLeft + direction * pageDistance),
          );

      container.scrollTo({
        left: target,
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
      if (!container) return;

      const horizontalDelta =
        event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (
        horizontalDelta === 0 ||
        (!event.shiftKey &&
          Math.abs(horizontalDelta) <= Math.abs(event.deltaY))
      ) {
        return;
      }

      event.preventDefault();
      container.scrollLeft += horizontalDelta;
    },
    [containerRef],
  );

  return {
    hasOverflow,
    visibleItems,
    handleNext: () => scroll(1),
    handlePrevious: () => scroll(-1),
    handleWheel,
    updateScrollState,
  };
}
