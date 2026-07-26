import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
  type WheelEvent,
} from "react";
import {
  animateCarouselWrap,
  cancelCarouselWrapAnimation,
} from "../animations";
import {
  getCarouselPageDistance,
  getCarouselScrollDestination,
  getCarouselScrollState,
  type CarouselScrollState,
} from "../utils";

interface UseCarouselScrollOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  totalItems: number;
  itemsPerView?: number;
  targetCardWidth?: number;
  gap?: number;
}

export function calculateVisibleCarouselItems({
  availableWidth,
  targetCardWidth,
  gap,
  itemsPerView,
}: {
  availableWidth: number;
  targetCardWidth: number;
  gap: number;
  itemsPerView?: number;
}) {
  if (itemsPerView !== undefined) {
    return availableWidth < 768 ? Math.min(2, itemsPerView) : itemsPerView;
  }

  const calculatedItems = Math.floor(
    (availableWidth + gap) / (targetCardWidth + gap),
  );
  return Math.max(2, calculatedItems);
}

export function useCarouselScroll({
  containerRef,
  totalItems,
  itemsPerView,
  targetCardWidth = 250,
  gap = 16,
}: UseCarouselScrollOptions) {
  const [visibleItems, setVisibleItems] = useState(itemsPerView || 4);
  const [scrollState, setScrollState] = useState<CarouselScrollState>({
    hasOverflow: false,
    isAtStart: true,
    isAtEnd: true,
  });

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const nextState = getCarouselScrollState({
      scrollLeft: container.scrollLeft,
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
    });
    setScrollState((currentState) =>
      currentState.hasOverflow === nextState.hasOverflow &&
      currentState.isAtStart === nextState.isAtStart &&
      currentState.isAtEnd === nextState.isAtEnd
        ? currentState
        : nextState,
    );
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let animationFrame = 0;

    const scheduleScrollStateUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateScrollState);
    };

    const calculate = () => {
      const containerWidth = container.clientWidth || window.innerWidth;
      const styles = window.getComputedStyle(container);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft) +
        Number.parseFloat(styles.paddingRight);
      const availableWidth = Math.max(0, containerWidth - horizontalPadding);
      setVisibleItems(
        calculateVisibleCarouselItems({
          availableWidth,
          targetCardWidth,
          gap,
          itemsPerView,
        }),
      );
      scheduleScrollStateUpdate();
    };

    calculate();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(calculate);
    resizeObserver?.observe(container);
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(scheduleScrollStateUpdate);
    mutationObserver?.observe(container, { childList: true, subtree: true });
    container.addEventListener("load", scheduleScrollStateUpdate, true);
    window.addEventListener("resize", calculate);

    return () => {
      cancelAnimationFrame(animationFrame);
      cancelCarouselWrapAnimation(container);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      container.removeEventListener("load", scheduleScrollStateUpdate, true);
      window.removeEventListener("resize", calculate);
    };
  }, [
    containerRef,
    gap,
    itemsPerView,
    targetCardWidth,
    totalItems,
    updateScrollState,
  ]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(updateScrollState);
    return () => cancelAnimationFrame(animationFrame);
  }, [totalItems, updateScrollState, visibleItems]);

  const scroll = useCallback(
    (direction: -1 | 1) => {
      const container = containerRef.current;
      if (!container) return;
      const maximumScroll = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const firstItem = container.querySelector<HTMLElement>('[role="group"]');
      const computedGap = Number.parseFloat(
        window.getComputedStyle(container).columnGap,
      );
      const pageDistance = getCarouselPageDistance({
        clientWidth: container.clientWidth,
        itemWidth: firstItem?.getBoundingClientRect().width ?? 0,
        gap: Number.isFinite(computedGap) ? computedGap : gap,
      });
      const destination = getCarouselScrollDestination({
        scrollLeft: container.scrollLeft,
        maximumScroll,
        direction,
        pageDistance,
      });
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      cancelCarouselWrapAnimation(container);
      if (destination.isWrapping && !prefersReducedMotion) {
        void animateCarouselWrap({
          container,
          target: destination.target,
          direction,
          onPositionChange: updateScrollState,
        });
        return;
      }

      container.scrollTo({
        left: destination.target,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      requestAnimationFrame(updateScrollState);
    },
    [containerRef, gap, updateScrollState],
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;
      cancelCarouselWrapAnimation(container);

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
      requestAnimationFrame(updateScrollState);
    },
    [containerRef, updateScrollState],
  );

  return {
    ...scrollState,
    visibleItems,
    handleNext: () => scroll(1),
    handlePrevious: () => scroll(-1),
    handleWheel,
    updateScrollState,
  };
}
