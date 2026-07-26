import { Children, useId, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const titleId = useId();
  const items = Children.toArray(children);
  const scroll = useCarouselScroll({
    containerRef,
    totalItems: items.length,
    itemsPerView,
    targetCardWidth,
    gap,
  });
  const showNavigation = !disableNavigation && scroll.hasOverflow;

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "Content carousel"}
      className={`group relative ${className}`}
    >
      {title && (
        <h2
          id={titleId}
          className="pl-4 text-2xl font-bold text-white md:pl-12 md:text-3xl"
        >
          {title}
        </h2>
      )}

      <div className="relative">
        {showNavigation && (
          <CarouselButton
            direction="previous"
            onClick={scroll.handlePrevious}
          />
        )}
        {showNavigation && (
          <CarouselButton direction="next" onClick={scroll.handleNext} />
        )}

        <div
          ref={containerRef}
          onScroll={scroll.updateScrollState}
          onWheel={scroll.handleWheel}
          tabIndex={0}
          aria-label={title ? `${title} items` : "Carousel items"}
          data-carousel-scroller
          className="flex snap-x snap-proximity gap-4 overflow-x-auto overscroll-x-contain px-4 py-4 [scroll-padding-inline:1rem] [scrollbar-width:none] [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:px-12 md:[scroll-padding-inline:3rem]"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((child, index) => (
            <div
              key={typeof child === "object" && child && "key" in child && child.key
                ? child.key
                : `carousel-item-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${items.length}`}
              className="shrink-0 snap-start"
              style={{
                width: `calc((100% - ${gap * (scroll.visibleItems - 1)}px) / ${scroll.visibleItems})`,
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface CarouselButtonProps {
  direction: "previous" | "next";
  onClick: () => void;
}

function CarouselButton({ direction, onClick }: CarouselButtonProps) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${isPrevious ? "Previous" : "Next"} items`}
      className={`absolute top-1/2 z-40 flex size-12 -translate-y-1/2 items-center justify-center bg-black/80 text-white opacity-100 transition-opacity hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
        isPrevious ? "left-0 rounded-r-lg" : "right-0 rounded-l-lg"
      }`}
    >
      <Icon aria-hidden="true" className="size-7" />
    </button>
  );
}
