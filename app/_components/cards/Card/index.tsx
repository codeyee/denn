import { motion, AnimatePresence } from "motion/react";
import { useRef, useEffect, useState } from "react";
import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";

import { contentTypeEnum } from "@/types/types";

const ICON_MAP = {
  movie: Film,
  tv: Tv,
  game: Gamepad2,
  book: Book,
  music: Music,
} as const;

const DEFAULT_CARD_ASPECT_RATIO = "5 / 8";

interface CardProps {
  id: string | number;
  title: string;
  type?: contentTypeEnum;

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
      className={`flex items-center gap-1 text-[9px] md:text-xs text-white/80 font-sans drop-shadow-text ${className}`}
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
}: CardProps) {
  const Icon = icon || (type ? ICON_MAP[type] : Film);
  const EmptyIcon = emptyIcon || Icon;
  const previousImageRef = useRef<string | undefined>(undefined);
  const isFirstImageRef = useRef(true);
  const [isHovered, setIsHovered] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isDesktop, setIsDesktop] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Detect if we're on desktop (1024px and above)
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add listener for resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Update refs after render to track image changes
  useEffect(() => {
    if (previousImageRef.current !== backgroundImage) {
      if (previousImageRef.current !== undefined) {
        isFirstImageRef.current = false;
      }
      previousImageRef.current = backgroundImage;
    }
  }, [backgroundImage]);

  // Notify parent of hover state changes
  useEffect(() => {
    if (onHoverChange) {
      onHoverChange(isHovered);
    }
  }, [isHovered, onHoverChange]);

  // Only show hover content on desktop
  const shouldShowHoverContent = isDesktop && hoverContent;

  // Update popover position when hovering or scrolling
  useEffect(() => {
    const updatePosition = () => {
      if (isHovered && cardRef.current && shouldShowHoverContent) {
        const rect = cardRef.current.getBoundingClientRect();
        
        // Since we're using transform with origin 'center center',
        // we position the element at the card's position, and CSS will handle centering the scale
        setPopoverPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    updatePosition();

    // Update position on scroll and resize
    if (isHovered && shouldShowHoverContent) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isHovered, shouldShowHoverContent]);

  const handleMouseEnter = () => {
    // Only enable hover on desktop
    if (isDesktop) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        key={id}
        className={`w-full ${className}`}
        style={noAspectRatio ? undefined : { aspectRatio: DEFAULT_CARD_ASPECT_RATIO }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
            className={`absolute inset-x-0 bottom-0 h-[55%] md:h-[55%] bg-linear-to-t ${
              isEmpty
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
                <span className="text-sm md:text-xl font-bold drop-shadow-text line-clamp-2 wrap-break-word">
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
              animate={{ opacity: 1, scale: 1.25 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="fixed rounded-2xl bg-neutral-900 shadow-2xl border border-white/10 overflow-hidden"
              style={{
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                width: `${popoverPosition.width}px`,
                zIndex: 200,
                maxWidth: '400px',
              }}
            >
              {/* Image at the top */}
              <div className="relative w-full aspect-[5/8]">
                {isEmpty ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-empty-card">
                    {EmptyIcon && (
                      <EmptyIcon className="w-16 h-16 md:w-20 md:h-20 text-gray-400 opacity-50" />
                    )}
                  </div>
                ) : (
                  <div
                    className="absolute inset-0 bg-center bg-cover"
                    style={{ backgroundImage: `url(${backgroundImage})` }}
                  />
                )}
                
                {/* Overlay and gradient */}
                {!isEmpty && <div className="absolute inset-0 bg-black/20" />}
                <div
                  className={`absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t ${
                    isEmpty
                      ? "from-gray-700/80 via-gray-600/40 to-transparent"
                      : "from-black/95 via-black/60 to-transparent"
                  }`}
                />
                
                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-5">
                  <div className="flex items-center gap-2 md:gap-3 text-white">
                    <Icon className="w-4 h-4 md:w-6 md:h-6 shrink-0 drop-shadow-text" />
                    <span className="text-sm md:text-xl font-bold drop-shadow-text line-clamp-2 wrap-break-word">
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

export default Card;
