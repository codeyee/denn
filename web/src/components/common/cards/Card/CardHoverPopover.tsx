import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { FocusEvent, RefObject } from "react";
import { createPortal } from "react-dom";

import { CardMedia } from "./CardMedia";
import type { CardHoverPosition } from "./cardHoverPosition";

interface CardHoverPopoverProps {
  activeImageIndex: number;
  alt: string;
  backgroundImage?: string;
  backgroundImages?: string[];
  children: React.ReactNode;
  emptyIcon: LucideIcon;
  icon: LucideIcon;
  isEmpty: boolean;
  isOpen: boolean;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onWheel: () => void;
  overlay?: React.ReactNode;
  popoverRef: RefObject<HTMLDivElement | null>;
  position: CardHoverPosition;
  title: string;
}

export function CardHoverPopover({
  activeImageIndex,
  alt,
  backgroundImage,
  backgroundImages,
  children,
  emptyIcon,
  icon: Icon,
  isEmpty,
  isOpen,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  onWheel,
  overlay,
  popoverRef,
  position,
  title,
}: CardHoverPopoverProps) {
  const prefersReducedMotion = useReducedMotion();
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96 }
          }
          animate={{ opacity: 1, scale: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96 }
          }
          transition={{
            duration: prefersReducedMotion ? 0 : 0.18,
            ease: "easeOut",
          }}
          role="group"
          aria-label={`${title} quick actions`}
          data-card-hover-popover
          onFocusCapture={onFocus}
          onBlurCapture={onBlur}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onWheel={onWheel}
          className="fixed overflow-hidden rounded-2xl bg-neutral-900 shadow-lg"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            zIndex: "var(--z-card-popover)",
          }}
        >
          <div className="relative aspect-5/8 w-full">
            <CardMedia
              activeImageIndex={activeImageIndex}
              alt={alt}
              backgroundImage={backgroundImage}
              backgroundImages={backgroundImages}
              emptyIcon={emptyIcon}
              isEmpty={isEmpty}
            />
            {!isEmpty && <div className="absolute inset-0 z-5 bg-black/20" />}
            <div className="absolute inset-x-0 bottom-0 z-5 h-[55%] bg-linear-to-t from-black/95 via-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-5">
              <div className="flex items-center gap-2 text-white md:gap-3">
                <Icon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 drop-shadow-text md:h-6 md:w-6"
                />
                <span className="line-clamp-3 text-sm font-bold drop-shadow-text md:text-xl">
                  {title}
                </span>
              </div>
            </div>
          </div>
          {overlay}
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
