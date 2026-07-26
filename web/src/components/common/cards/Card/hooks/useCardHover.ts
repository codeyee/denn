import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import {
  calculateCardHoverPosition,
  isCardAnchorVisible,
  type CardHoverPosition,
} from "../cardHoverPosition";
import { useCardHoverCapability } from "./useCardHoverCapability";

interface UseCardHoverProps {
  disableHover?: boolean;
  hasHoverContent?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
}

const POPOVER_OPEN_DELAY_MS = 120;
const POPOVER_CLOSE_DELAY_MS = 80;
const INITIAL_POSITION: CardHoverPosition = {
  top: 0,
  left: 0,
  width: 0,
  maxHeight: 0,
};

export function useCardHover({
  disableHover = false,
  hasHoverContent = false,
  onHoverChange,
}: UseCardHoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pointerReleaseTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const suppressOpenRef = useRef(false);
  const releaseSuppressionRef = useRef<(() => void) | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [popoverPosition, setPopoverPosition] =
    useState<CardHoverPosition>(INITIAL_POSITION);
  const isHoverCapable = useCardHoverCapability();

  const cancelPendingClose = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const cancelPendingOpen = useCallback(() => {
    if (openTimerRef.current === null) return;
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }, []);

  const releasePointerSuppression = useCallback(() => {
    if (pointerReleaseTimerRef.current !== null) {
      window.clearTimeout(pointerReleaseTimerRef.current);
    }
    pointerReleaseTimerRef.current = window.setTimeout(() => {
      pointerReleaseTimerRef.current = null;
      suppressOpenRef.current = false;
    }, 0);
  }, []);

  const closeImmediately = useCallback(() => {
    cancelPendingOpen();
    cancelPendingClose();
    setIsHovered(false);
  }, [cancelPendingClose, cancelPendingOpen]);

  const closeUntilPointerLeaves = useCallback(() => {
    suppressOpenRef.current = true;
    closeImmediately();
    releaseSuppressionRef.current?.();

    const releaseOnPointerMove = (event: PointerEvent) => {
      const anchor = cardRef.current?.getBoundingClientRect();
      const isInsideAnchor =
        anchor &&
        event.clientX >= anchor.left &&
        event.clientX <= anchor.right &&
        event.clientY >= anchor.top &&
        event.clientY <= anchor.bottom;
      if (isInsideAnchor) return;

      suppressOpenRef.current = false;
      document.removeEventListener("pointermove", releaseOnPointerMove);
      releaseSuppressionRef.current = null;
    };

    document.addEventListener("pointermove", releaseOnPointerMove);
    releaseSuppressionRef.current = () => {
      document.removeEventListener("pointermove", releaseOnPointerMove);
      releaseSuppressionRef.current = null;
    };
  }, [closeImmediately]);

  const closeUntilPointerMoves = useCallback(() => {
    suppressOpenRef.current = true;
    closeImmediately();
    releaseSuppressionRef.current?.();

    const releaseOnPointerMove = () => {
      suppressOpenRef.current = false;
      document.removeEventListener("pointermove", releaseOnPointerMove);
      releaseSuppressionRef.current = null;
    };

    document.addEventListener("pointermove", releaseOnPointerMove);
    releaseSuppressionRef.current = () => {
      document.removeEventListener("pointermove", releaseOnPointerMove);
      releaseSuppressionRef.current = null;
    };
  }, [closeImmediately]);

  const openImmediately = useCallback(() => {
    cancelPendingOpen();
    cancelPendingClose();
    if (suppressOpenRef.current) return;
    if (isHoverCapable && !disableHover && hasHoverContent) {
      const anchor = cardRef.current?.getBoundingClientRect();
      if (
        !anchor ||
        !isCardAnchorVisible(anchor, window.innerWidth, window.innerHeight)
      ) {
        return;
      }
      setPopoverPosition(
        calculateCardHoverPosition({
          anchor,
          popoverHeight: anchor.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }),
      );
      setIsHovered(true);
    }
  }, [
    cancelPendingClose,
    cancelPendingOpen,
    disableHover,
    hasHoverContent,
    isHoverCapable,
  ]);

  const scheduleOpen = useCallback(() => {
    cancelPendingOpen();
    cancelPendingClose();
    if (
      suppressOpenRef.current ||
      !isHoverCapable ||
      disableHover ||
      !hasHoverContent
    ) {
      return;
    }
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      openImmediately();
    }, POPOVER_OPEN_DELAY_MS);
  }, [
    cancelPendingClose,
    cancelPendingOpen,
    disableHover,
    hasHoverContent,
    isHoverCapable,
    openImmediately,
  ]);

  const scheduleClose = useCallback(() => {
    cancelPendingOpen();
    cancelPendingClose();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setIsHovered(false);
    }, POPOVER_CLOSE_DELAY_MS);
  }, [cancelPendingClose, cancelPendingOpen]);

  useEffect(() => {
    onHoverChange?.(isHovered);
  }, [isHovered, onHoverChange]);

  const shouldShowHoverContent =
    isHoverCapable && hasHoverContent && !disableHover;

  useEffect(() => {
    if (!isHovered || !shouldShowHoverContent) return;

    const updatePosition = () => {
      const card = cardRef.current;
      if (!card) {
        closeImmediately();
        return;
      }
      const anchor = card.getBoundingClientRect();
      if (
        !isCardAnchorVisible(anchor, window.innerWidth, window.innerHeight)
      ) {
        closeImmediately();
        return;
      }

      const popoverHeight =
        popoverRef.current?.getBoundingClientRect().height ?? 0;
      const nextPosition = calculateCardHoverPosition({
        anchor,
        popoverHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      setPopoverPosition((current) =>
        positionsMatch(current, nextPosition) ? current : nextPosition,
      );
    };

    const schedulePositionUpdate = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        updatePosition();
      });
    };

    schedulePositionUpdate();
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedulePositionUpdate);
    if (cardRef.current) resizeObserver?.observe(cardRef.current);
    if (popoverRef.current) resizeObserver?.observe(popoverRef.current);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeUntilPointerLeaves();
    };
    window.addEventListener("scroll", closeImmediately, true);
    window.addEventListener("resize", schedulePositionUpdate);
    document.addEventListener("keydown", handleEscape);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", closeImmediately, true);
      window.removeEventListener("resize", schedulePositionUpdate);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [
    closeImmediately,
    closeUntilPointerLeaves,
    isHovered,
    shouldShowHoverContent,
  ]);

  useEffect(() => {
    if (!shouldShowHoverContent) closeImmediately();
  }, [closeImmediately, shouldShowHoverContent]);

  useEffect(
    () => () => {
      cancelPendingClose();
      cancelPendingOpen();
      releaseSuppressionRef.current?.();
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (pointerReleaseTimerRef.current !== null) {
        window.clearTimeout(pointerReleaseTimerRef.current);
      }
    },
    [cancelPendingClose, cancelPendingOpen],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        (cardRef.current?.contains(nextTarget) ||
          popoverRef.current?.contains(nextTarget))
      ) {
        return;
      }
      scheduleClose();
    },
    [scheduleClose],
  );

  const handleCardPointerDown = useCallback(() => {
    cancelPendingOpen();
    suppressOpenRef.current = true;
  }, [cancelPendingOpen]);

  return {
    cardRef,
    popoverRef,
    isHovered,
    popoverPosition,
    shouldShowHoverContent,
    handleCardMouseEnter: scheduleOpen,
    handlePopoverMouseEnter: openImmediately,
    handleMouseLeave: scheduleClose,
    handleCardPointerDown,
    handleCardPointerUp: releasePointerSuppression,
    handleWheel: closeUntilPointerMoves,
    handleFocus: openImmediately,
    handleBlur,
  };
}

function positionsMatch(
  left: CardHoverPosition,
  right: CardHoverPosition,
): boolean {
  return (
    left.top === right.top &&
    left.left === right.left &&
    left.width === right.width &&
    left.maxHeight === right.maxHeight
  );
}
