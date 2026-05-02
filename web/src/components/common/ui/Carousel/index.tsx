
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCarouselScroll } from "./hooks/useCarouselScroll";

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
  const containerRef = useRef<HTMLDivElement>(null);

  const items = Array.isArray(children) ? children : [children];
  const totalItems = items.length;

  const {
    currentIndex,
    isHovered,
    isMobile,
    visibleItems,
    setIsHovered,
    handlePrevious,
    handleNext,
  } = useCarouselScroll({
    totalItems,
    itemsPerView,
    targetCardWidth,
    gap,
  });

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
