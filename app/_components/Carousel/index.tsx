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
}

export default function Carousel({
  children,
  title,
  className = "",
  itemsPerView = 4,
  gap = 16,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert children to array for easier manipulation
  const items = Array.isArray(children) ? children : [children];
  const totalItems = items.length;

  // Calculate how many items can be displayed at once
  const [visibleItems, setVisibleItems] = useState(itemsPerView);

  // Responsive adjustment
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 640) {
        setVisibleItems(2);
      } else if (width < 768) {
        setVisibleItems(2);
      } else if (width < 1024) {
        setVisibleItems(3);
      } else {
        setVisibleItems(itemsPerView);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [itemsPerView]);

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

  // Show navigation buttons only if there are more items than can be displayed
  const showNavigation = totalItems > visibleItems;

  return (
    <div className={`relative group ${className}`}>
      {/* Title */}
      {title && (
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 pl-4 md:pl-12">
          {title}
        </h2>
      )}

      {/* Carousel Container */}
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left Navigation Button */}
        <AnimatePresence>
          {showNavigation && (isMobile || isHovered) && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handlePrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-2 md:p-4 rounded-r-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
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
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-black/90 text-white p-2 md:p-4 rounded-l-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Next items"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Carousel Items Container */}
        <div
          className="overflow-x-hidden overflow-y-visible pl-4 md:pl-12 pr-4 md:pr-12 py-4"
          ref={containerRef}
        >
          <motion.div
            className="flex"
            animate={{
              x: `-${currentIndex * (100 / visibleItems)}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            style={{ gap: `${gap}px` }}
          >
            {items.map((child, index) => (
              <motion.div
                key={index}
                className="flex-shrink-0"
                style={{
                  width: `calc((100% - ${
                    gap * (visibleItems - 1)
                  }px) / ${visibleItems})`,
                }}
                whileHover={{ scale: 1.05, zIndex: 10 }}
                transition={{ duration: 0.3 }}
              >
                {child}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
