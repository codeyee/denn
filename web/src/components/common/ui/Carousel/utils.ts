const SCROLL_TOLERANCE = 2;

interface CarouselScrollStateOptions {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}

export interface CarouselScrollState {
  hasOverflow: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
}

export function getCarouselScrollState({
  scrollLeft,
  scrollWidth,
  clientWidth,
}: CarouselScrollStateOptions): CarouselScrollState {
  const maximumScroll = Math.max(0, scrollWidth - clientWidth);
  const normalizedScrollLeft = Math.min(
    maximumScroll,
    Math.max(0, scrollLeft),
  );
  const hasOverflow = maximumScroll > SCROLL_TOLERANCE;

  return {
    hasOverflow,
    isAtStart: normalizedScrollLeft <= SCROLL_TOLERANCE,
    isAtEnd:
      !hasOverflow ||
      normalizedScrollLeft >= maximumScroll - SCROLL_TOLERANCE,
  };
}

export function getCarouselScrollDestination({
  scrollLeft,
  maximumScroll,
  direction,
  pageDistance,
}: {
  scrollLeft: number;
  maximumScroll: number;
  direction: -1 | 1;
  pageDistance: number;
}) {
  if (maximumScroll <= SCROLL_TOLERANCE) {
    return { target: 0, isWrapping: false };
  }

  const normalizedScrollLeft = Math.min(
    maximumScroll,
    Math.max(0, scrollLeft),
  );
  if (direction === -1 && normalizedScrollLeft <= SCROLL_TOLERANCE) {
    return { target: maximumScroll, isWrapping: true };
  }
  if (
    direction === 1 &&
    normalizedScrollLeft >= maximumScroll - SCROLL_TOLERANCE
  ) {
    return { target: 0, isWrapping: true };
  }

  return {
    target: Math.min(
      maximumScroll,
      Math.max(0, normalizedScrollLeft + direction * pageDistance),
    ),
    isWrapping: false,
  };
}

export function getCarouselPageDistance({
  clientWidth,
  itemWidth,
  gap,
}: {
  clientWidth: number;
  itemWidth: number;
  gap: number;
}) {
  if (itemWidth <= 0) {
    return clientWidth * 0.85;
  }

  const itemStep = itemWidth + gap;
  const visibleItems = Math.max(
    1,
    Math.floor((clientWidth + gap) / itemStep),
  );
  const contextPreservingSteps = Math.max(1, visibleItems - 1);

  return Math.min(clientWidth, contextPreservingSteps * itemStep);
}
