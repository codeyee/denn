export interface CardHoverPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

interface CardHoverPositionOptions {
  anchor: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
  popoverHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportGap?: number;
}

const DEFAULT_VIEWPORT_GAP = 16;

export function calculateCardHoverPosition({
  anchor,
  popoverHeight,
  viewportWidth,
  viewportHeight,
  viewportGap = DEFAULT_VIEWPORT_GAP,
}: CardHoverPositionOptions): CardHoverPosition {
  const availableWidth = Math.max(0, viewportWidth - viewportGap * 2);
  const availableHeight = Math.max(0, viewportHeight - viewportGap * 2);
  const width = Math.min(anchor.width, availableWidth);
  const measuredHeight = popoverHeight > 0 ? popoverHeight : anchor.height;
  const height = Math.min(measuredHeight, availableHeight);
  const centeredLeft = anchor.left + (anchor.width - width) / 2;
  const maximumLeft = Math.max(viewportGap, viewportWidth - viewportGap - width);
  const maximumTop = Math.max(
    viewportGap,
    viewportHeight - viewportGap - height,
  );

  return {
    top: clamp(anchor.top, viewportGap, maximumTop),
    left: clamp(centeredLeft, viewportGap, maximumLeft),
    width,
    maxHeight: availableHeight,
  };
}

export function isCardAnchorVisible(
  anchor: CardHoverPositionOptions["anchor"],
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  return (
    anchor.width > 0 &&
    anchor.height > 0 &&
    anchor.bottom > 0 &&
    anchor.right > 0 &&
    anchor.top < viewportHeight &&
    anchor.left < viewportWidth
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
