"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CarouselProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  itemsPerView?: number;
  gap?: number;
  targetCardWidth?: number;
  disableNavigation?: boolean;
}

export function Carousel({
  children,
  title,
  className = "",
  itemsPerView,
  gap = 16,
  targetCardWidth = 250,
  disableNavigation = false,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert children to array for easier manipulation
  const items = Array.isArray(children) ? children : [children];
  const totalItems = items.length;

  // Calculate how many items can be displayed at once
  const [visibleItems, setVisibleItems] = useState(itemsPerView || 4);

  // Responsive adjustment
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);

      // If itemsPerView is explicitly set, use breakpoint logic
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
        // Calculate based on available width and target card width
        // Account for padding (12px * 2 on each side = 48px on mobile, 96px on desktop)
        const horizontalPadding = width < 768 ? 32 : 96;
        const availableWidth = width - horizontalPadding;

        // Calculate how many cards can fit: (availableWidth + gap) / (targetCardWidth + gap)
        const calculatedItems = Math.floor(
          (availableWidth + gap) / (targetCardWidth + gap)
        );

        // Ensure at least 2 items on mobile, at least 3 on tablet, and reasonable max
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

  // Calculate the maximum index for scrolling
  const maxIndex = Math.max(0, totalItems - visibleItems);

  // Navigate to previous items
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      // Cyclic behavior: if at the start, go to the end
      if (prev === 0) {
        return maxIndex;
      }
      return Math.max(0, prev - visibleItems);
    });
  }, [maxIndex, visibleItems]);

  // Navigate to next items
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      // Cyclic behavior: if at the end, go to the start
      if (prev >= maxIndex) {
        return 0;
      }
      return Math.min(maxIndex, prev + visibleItems);
    });
  }, [maxIndex, visibleItems]);

  const showNavigation = !disableNavigation && totalItems > visibleItems;

  return (
    <div className={`relative group ${className}`}>
      {/* Title */}
      {title && (
        <h2 className="text-2xl md:text-3xl font-bold text-white pl-4 md:pl-12">
          {title}
        </h2>
      )}

      {/* Carousel Container */}
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Invisible blocker for left navigation area - prevents hover on cards behind arrows */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-16 md:w-24 z-30 pointer-events-auto"
        />
        
        {/* Invisible blocker for right navigation area - prevents hover on cards behind arrows */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-16 md:w-24 z-30 pointer-events-auto"
        />

        {/* Left Navigation Button */}
        <AnimatePresence>
          {showNavigation && (isMobile || isHovered) && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handlePrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-black/70 hover:bg-black/90 text-white p-2 md:p-4 rounded-r-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Previous items"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right Navigation Button */}
        <AnimatePresence>
          {showNavigation && (isMobile || isHovered) && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-black/70 hover:bg-black/90 text-white p-2 md:p-4 rounded-l-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Next items"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Carousel Items Container */}
        <div
          className="overflow-hidden pl-4 md:pl-12 pr-4 md:pr-12 py-4"
          ref={containerRef}
        >
          <motion.div
            className="flex"
            animate={{
              x: disableNavigation ? 0 : `-${currentIndex * (100 / visibleItems)}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            style={{ gap: `${gap}px` }}
          >
            <AnimatePresence mode="popLayout">
              {items.map((child, index) => {
                const childKey = (typeof child === 'object' && child !== null && 'key' in child && typeof child.key === 'string')
                  ? child.key
                  : `carousel-item-${index}`;
                return (
                  <motion.div
                    key={childKey}
                    className="shrink-0"
                    style={{
                      width: `calc((100% - ${
                        gap * visibleItems
                      }px) / ${visibleItems})`,
                    }}
                  >
                    {child}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
