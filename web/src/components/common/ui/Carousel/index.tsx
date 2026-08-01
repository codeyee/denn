import { Children, useId, useRef } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useCarouselScroll } from "./hooks/useCarouselScroll";
import { SectionTitle } from "../SectionTitle";

interface CarouselProps {
  children: React.ReactNode;
  title?: string;
  titleIcon?: LucideIcon;
  titleAction?: React.ReactNode;
  className?: string;
  itemsPerView?: number;
  gap?: number;
  targetCardWidth?: number;
  disableNavigation?: boolean;
}

export function Carousel({
  children,
  title,
  titleIcon,
  titleAction,
  className = "",
  itemsPerView,
  gap = 16,
  targetCardWidth = 250,
  disableNavigation = false,
}: CarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const scrollerId = useId();
  const items = Children.toArray(children);
  const scroll = useCarouselScroll({
    containerRef,
    totalItems: items.length,
    itemsPerView,
    targetCardWidth,
    gap,
  });
  const showNavigation = !disableNavigation && scroll.hasOverflow;
  const showPreviousFade = showNavigation && !scroll.isAtStart;
  const showNextFade = showNavigation && !scroll.isAtEnd;

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "Content carousel"}
      className={`layout-carousel group relative ${className}`}
    >
      <div className="layout-carousel-content">
        {title && (
          <SectionTitle
            id={titleId}
            icon={titleIcon}
            title={title}
            action={titleAction}
          />
        )}

        <div className="layout-carousel-track">
          {showPreviousFade && <CarouselEdgeFade direction="previous" />}
          {showNextFade && <CarouselEdgeFade direction="next" />}
          {showNavigation && (
            <CarouselButton
              direction="previous"
              onClick={scroll.handlePrevious}
              scrollerId={scrollerId}
            />
          )}
          {showNavigation && (
            <CarouselButton
              direction="next"
              onClick={scroll.handleNext}
              scrollerId={scrollerId}
            />
          )}

          <div
            id={scrollerId}
            ref={containerRef}
            onScroll={scroll.updateScrollState}
            onWheel={scroll.handleWheel}
            tabIndex={0}
            aria-label={title ? `${title} items` : "Carousel items"}
            data-carousel-scroller
            className="flex snap-x snap-proximity gap-4 overflow-x-auto overscroll-x-contain px-0 py-4 [scroll-padding-inline:0] [scrollbar-width:none] [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
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
      </div>
    </section>
  );
}

interface CarouselDirectionProps {
  direction: "previous" | "next";
}

interface CarouselButtonProps extends CarouselDirectionProps {
  onClick: () => void;
  scrollerId: string;
}

function CarouselEdgeFade({ direction }: CarouselDirectionProps) {
  const isPrevious = direction === "previous";

  return (
    <div
      data-carousel-edge={direction}
      className={`pointer-events-none absolute inset-y-4 z-30 w-16 md:w-24 ${
        isPrevious
          ? "left-0 bg-linear-to-r from-background-logged-in via-background-logged-in/80 to-transparent"
          : "right-0 bg-linear-to-l from-background-logged-in via-background-logged-in/80 to-transparent"
      }`}
    />
  );
}

function CarouselButton({
  direction,
  onClick,
  scrollerId,
}: CarouselButtonProps) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-controls={scrollerId}
      aria-label={isPrevious ? "View previous content" : "View next content"}
      data-carousel-control={direction}
      className="absolute top-1/2 z-40 flex size-11 -translate-y-1/2 touch-manipulation cursor-pointer items-center justify-center rounded-full bg-black/80 text-white opacity-80 transition-[opacity,transform,background-color] duration-200 active:scale-95 hover:scale-105 hover:bg-black hover:opacity-100 focus-visible:scale-105 focus-visible:bg-black focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100 md:size-12"
    >
      <Icon aria-hidden="true" className="size-6 md:size-7" />
    </button>
  );
}
