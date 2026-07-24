import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";

import { CardMedia } from "./CardMedia";

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
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  position: { top: number; left: number; width: number };
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
  onMouseEnter,
  onMouseLeave,
  position,
  title,
}: CardHoverPopoverProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="fixed overflow-hidden rounded-2xl bg-neutral-900 shadow-lg"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 200,
            maxWidth: 400,
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
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
