import {
  useCallback,
  useRef,
  type TouchEvent,
  type WheelEvent,
} from "react";

interface UseBannerGesturesParams {
  onPrevious: () => void;
  onNext: () => void;
}

const TOUCH_SWIPE_THRESHOLD = 48;
const WHEEL_SWIPE_THRESHOLD = 24;
const WHEEL_COOLDOWN_MS = 450;

export function useBannerGestures({
  onPrevious,
  onNext,
}: UseBannerGesturesParams) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastWheelNavigationAt = useRef(0);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }

    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || event.changedTouches.length !== 1) return;

      const touch = event.changedTouches[0];
      const horizontalDistance = touch.clientX - start.x;
      const verticalDistance = touch.clientY - start.y;
      if (
        Math.abs(horizontalDistance) < TOUCH_SWIPE_THRESHOLD ||
        Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
      ) {
        return;
      }

      if (horizontalDistance > 0) {
        onPrevious();
      } else {
        onNext();
      }
    },
    [onNext, onPrevious],
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      if (
        Math.abs(event.deltaX) < WHEEL_SWIPE_THRESHOLD ||
        Math.abs(event.deltaX) <= Math.abs(event.deltaY)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastWheelNavigationAt.current < WHEEL_COOLDOWN_MS) return;

      event.preventDefault();
      lastWheelNavigationAt.current = now;
      if (event.deltaX > 0) {
        onNext();
      } else {
        onPrevious();
      }
    },
    [onNext, onPrevious],
  );

  return {
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel: () => {
      touchStart.current = null;
    },
    handleWheel,
  };
}
