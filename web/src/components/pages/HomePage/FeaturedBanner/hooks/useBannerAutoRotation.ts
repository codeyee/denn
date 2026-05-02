import { useState, useEffect, useRef } from "react";

interface UseBannerAutoRotationParams {
  itemCount: number;
  autoRotateMs: number;
}

export function useBannerAutoRotation({
  itemCount,
  autoRotateMs,
}: UseBannerAutoRotationParams) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (itemCount <= 1) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % itemCount);
    }, autoRotateMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [index, itemCount, autoRotateMs]);

  return { index, setIndex };
}
