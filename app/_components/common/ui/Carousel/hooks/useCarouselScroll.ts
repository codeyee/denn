import { useState, useEffect, useCallback } from "react";

interface UseCarouselScrollOptions {
  totalItems: number;
  itemsPerView?: number;
  targetCardWidth?: number;
  gap?: number;
}

export function useCarouselScroll({
  totalItems,
  itemsPerView,
  targetCardWidth = 250,
  gap = 16,
}: UseCarouselScrollOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleItems, setVisibleItems] = useState(itemsPerView || 4);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);

      if (itemsPerView !== undefined) {
        if (width < 640) {
          setVisibleItems(2);
        } else if (width < 768) {
          setVisibleItems(2);
        } else if (width < 1024) {
          setVisibleItems(3);
        } else {
          setVisibleItems(itemsPerView);
        }
      } else {
        const horizontalPadding = width < 768 ? 32 : 96;
        const availableWidth = width - horizontalPadding;
        const calculatedItems = Math.floor(
          (availableWidth + gap) / (targetCardWidth + gap)
        );

        if (width < 640) {
          setVisibleItems(Math.max(2, Math.min(calculatedItems, 3)));
        } else if (width < 768) {
          setVisibleItems(Math.max(2, Math.min(calculatedItems, 4)));
        } else if (width < 1024) {
          setVisibleItems(Math.max(3, Math.min(calculatedItems, 6)));
        } else {
          setVisibleItems(Math.max(4, Math.min(calculatedItems, 10)));
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [itemsPerView, targetCardWidth, gap]);

  const maxIndex = Math.max(0, totalItems - visibleItems);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev === 0) {
        return maxIndex;
      }
      return Math.max(0, prev - visibleItems);
    });
  }, [maxIndex, visibleItems]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return 0;
      }
      return Math.min(maxIndex, prev + visibleItems);
    });
  }, [maxIndex, visibleItems]);

  return {
    currentIndex,
    isHovered,
    isMobile,
    visibleItems,
    maxIndex,
    setIsHovered,
    handlePrevious,
    handleNext,
  };
}
