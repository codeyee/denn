import { motion, AnimatePresence } from "motion/react";
import { useRef, useEffect } from "react";
import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";

import { ContentType } from "@/lib/types";
import { useCardHover } from "./hooks/useCardHover";

const ICON_MAP = {
  [ContentType.MOVIE.toLowerCase()]: Film,
  [ContentType.TV_SHOW.toLowerCase()]: Tv,
  [ContentType.SEASON.toLowerCase()]: Tv,
  [ContentType.GAME.toLowerCase()]: Gamepad2,
  [ContentType.BOOK.toLowerCase()]: Book,
  [ContentType.ALBUM.toLowerCase()]: Music,
} as const;

const DEFAULT_CARD_ASPECT_RATIO = "5 / 8";

interface CardProps {
  id: string | number;
  title: string;
  type?: ContentType;

  className?: string;
  backgroundImage?: string;
  backgroundImageAlt?: string;
  icon?: LucideIcon;
  noAspectRatio?: boolean;

  isEmpty?: boolean;
  emptyIcon?: LucideIcon;

  children?: React.ReactNode;
  hoverContent?: React.ReactNode;
  onHoverChange?: (isHovered: boolean) => void;
  disableHover?: boolean;
}

interface CardFooterProps {
  children?: React.ReactNode;
  className?: string;
}

interface CardHoverContentProps {
  children?: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: CardFooterProps) {
  return (
    <div
      className={`flex gap-1 text-[9px] md:text-xs text-white/80 font-sans drop-shadow-text ${className}`}
    >
      {children}
    </div>
  );
}

function HoverContent({ children, className }: CardHoverContentProps) {
  return (
    <div className={`w-full px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-5 ${className}`}>
      {children}
    </div>
  );
}

function Card({
  id,
  title,
  type,
  backgroundImage,
  backgroundImageAlt,
  icon,
  emptyIcon,
  noAspectRatio = false,
  isEmpty = false,
  className = "",
  children,
  hoverContent,
  onHoverChange,
  disableHover = false,
}: CardProps) {
  const Icon = icon || (type ? ICON_MAP[type.toLowerCase()] || Film : Film);
  const EmptyIcon = emptyIcon || Icon;
  const previousImageRef = useRef<string | undefined>(undefined);
  const isFirstImageRef = useRef(true);

  const {
    cardRef,
    isHovered,
    popoverPosition,
    shouldShowHoverContent,
    handleMouseEnter,
    handleMouseLeave,
  } = useCardHover({
    disableHover,
    hasHoverContent: !!hoverContent,
    onHoverChange,
  });

  useEffect(() => {
    if (previousImageRef.current !== backgroundImage) {
      if (previousImageRef.current !== undefined) {
        isFirstImageRef.current = false;
      }
      previousImageRef.current = backgroundImage;
    }
  }, [backgroundImage]);

  return (
    <>
      <motion.div
        ref={cardRef}
        key={id}
        className={`w-full ${className} ${disableHover ? 'pointer-events-none' : ''}`}
        style={noAspectRatio ? undefined : { aspectRatio: DEFAULT_CARD_ASPECT_RATIO }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        {...(!disableHover && {
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
        })}
      >
        <motion.div
          className="relative overflow-visible rounded-2xl h-full bg-transparent backdrop-blur-lg p-0! border-none!"
          style={{
            zIndex: isHovered && hoverContent ? 100 : 1,
          }}
          animate={{
            scale: isHovered && hoverContent ? 1 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="relative overflow-hidden rounded-2xl h-full">
            {/* Background layer */}
            {isEmpty ? (
              <div
                className="absolute inset-0 flex items-center justify-center bg-empty-card"
                aria-label={backgroundImageAlt || "Empty list"}
              >
                {EmptyIcon && (
                  <EmptyIcon className="w-16 h-16 md:w-20 md:h-20 text-gray-400 opacity-50" />
                )}
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  key={backgroundImage}
                  className="absolute inset-0 bg-center bg-cover"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                  aria-label={backgroundImageAlt}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </AnimatePresence>
            )}

            {/* Overlay layer */}
            {!isEmpty && <div className="absolute inset-0 bg-black/20 md:bg-black/20" />}
            <div
              className={`absolute inset-x-0 bottom-0 h-[55%] md:h-[55%] bg-linear-to-t ${isEmpty
                  ? "from-gray-700/80 via-gray-600/40 to-transparent"
                  : "from-black/95 via-black/60 to-transparent md:from-black/95 md:via-black/40 md:to-transparent"
                }`}
            />

            {/* Content layer */}
            <div className="relative z-10 h-full flex flex-col">
              <div className="mt-auto w-full px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-5 space-y-2 md:space-y-4">
                {/* Title section */}
                <div className="flex items-center gap-2 md:gap-3 text-white mb-1 md:mb-2">
                  <Icon className="w-4 h-4 md:w-6 md:h-6 shrink-0 drop-shadow-text" />
                  <span className="text-sm md:text-xl font-bold drop-shadow-text line-clamp-3 wrap-break-word">
                    {title}
                  </span>
                </div>

                {children}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hover Popover - rendered as portal to avoid carousel clipping */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isHovered && shouldShowHoverContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0, transformOrigin: 'center center' }}
              animate={{ opacity: 1, scale: 1.15 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="fixed rounded-2xl bg-neutral-900 shadow-2xl border border-white/10 overflow-hidden cursor-pointer"
              style={{
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                width: `${popoverPosition.width}px`,
                zIndex: 200,
                maxWidth: '400px',
              }}
            >
              {/* Image at the top */}
              <div className="relative w-full aspect-5/8 cursor-pointer">
                {isEmpty ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-empty-card">
                    {EmptyIcon && (
                      <EmptyIcon className="w-16 h-16 md:w-20 md:h-20 text-gray-400 opacity-50" />
                    )}
                  </div>
                ) : (
                  <div
                    className="absolute inset-0 bg-center bg-cover cursor-pointer"
                    style={{ backgroundImage: `url(${backgroundImage})` }}
                  />
                )}

                {/* Overlay and gradient */}
                {!isEmpty && <div className="absolute inset-0 bg-black/20" />}
                <div
                  className={`absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t ${isEmpty
                      ? "from-gray-700/80 via-gray-600/40 to-transparent"
                      : "from-black/95 via-black/60 to-transparent"
                    }`}
                />

                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-5">
                  <div className="flex items-center gap-2 md:gap-3 text-white">
                    <Icon className="w-4 h-4 md:w-6 md:h-6 shrink-0 drop-shadow-text" />
                    <span className="text-sm md:text-xl font-bold drop-shadow-text line-clamp-3 wrap-break-word">
                      {title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hover content below image */}
              {hoverContent}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

Card.Footer = Footer;
Card.HoverContent = HoverContent;

export { Card };
