import { useEffect, useState } from "react";

interface UseBannerAutoRotationParams {
  itemCount: number;
  autoRotateMs: number;
  enabled: boolean;
  interactionPaused: boolean;
}

export function useBannerAutoRotation({
  itemCount,
  autoRotateMs,
  enabled,
  interactionPaused,
}: UseBannerAutoRotationParams) {
  const [index, setIndex] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);
  const isPaused = !enabled || interactionPaused || pausedByUser;

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, itemCount - 1)));
  }, [itemCount]);

  useEffect(() => {
    if (itemCount <= 1 || isPaused) return;
    const interval = window.setInterval(() => {
      setIndex((i) => (i + 1) % itemCount);
    }, autoRotateMs);

    return () => window.clearInterval(interval);
  }, [autoRotateMs, isPaused, itemCount]);

  return {
    index,
    setIndex,
    isPaused,
    pausedByUser,
    togglePaused: () => setPausedByUser((paused) => !paused),
  };
}
