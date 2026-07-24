import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Book, Film, Gamepad2, Music, Tv } from "lucide-react";

import { ContentType } from "@/lib/types";
import { CardHoverPopover } from "./CardHoverPopover";
import { CardMedia } from "./CardMedia";
import { useCardHover } from "./hooks/useCardHover";

const ICON_MAP = {
  [ContentType.MOVIE.toLowerCase()]: Film,
  [ContentType.TV_SHOW.toLowerCase()]: Tv,
  [ContentType.SEASON.toLowerCase()]: Tv,
  [ContentType.GAME.toLowerCase()]: Gamepad2,
  [ContentType.BOOK.toLowerCase()]: Book,
  [ContentType.ALBUM.toLowerCase()]: Music,
} as const;

interface CardProps {
  id: string | number;
  title: string;
  type?: ContentType;
  className?: string;
  backgroundImage?: string;
  backgroundImages?: string[];
  activeImageIndex?: number;
  backgroundImageAlt?: string;
  icon?: LucideIcon;
  noAspectRatio?: boolean;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  priorityImage?: boolean;
  children?: React.ReactNode;
  hoverContent?: React.ReactNode;
  onHoverChange?: (isHovered: boolean) => void;
  disableHover?: boolean;
}

interface CardSlotProps {
  children?: React.ReactNode;
  className?: string;
}

function Footer({ children, className = "" }: CardSlotProps) {
  return (
    <div
      className={`flex gap-1 text-[9px] text-white/80 drop-shadow-text md:text-xs ${className}`}
    >
      {children}
    </div>
  );
}

function HoverContent({ children, className = "" }: CardSlotProps) {
  return (
    <div className={`w-full px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-5 ${className}`}>
      {children}
    </div>
  );
}

function Card({
  id,
  title,
  type,
  backgroundImage,
  backgroundImages,
  activeImageIndex = 0,
  backgroundImageAlt,
  icon,
  emptyIcon,
  noAspectRatio = false,
  isEmpty = false,
  priorityImage = false,
  className = "",
  children,
  hoverContent,
  onHoverChange,
  disableHover = false,
}: CardProps) {
  const Icon = icon || (type ? ICON_MAP[type.toLowerCase()] || Film : Film);
  const EmptyIcon = emptyIcon || Icon;
  const alt = backgroundImageAlt || `${title} artwork`;
  const hover = useCardHover({
    disableHover,
    hasHoverContent: Boolean(hoverContent),
    onHoverChange,
  });

  return (
    <>
      <motion.div
        ref={hover.cardRef}
        key={id}
        className={`w-full ${className} ${disableHover ? "pointer-events-none" : ""}`}
        style={noAspectRatio ? undefined : { aspectRatio: "5 / 8" }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onMouseEnter={disableHover ? undefined : hover.handleMouseEnter}
        onMouseLeave={disableHover ? undefined : hover.handleMouseLeave}
      >
        <div className="relative h-full overflow-hidden rounded-2xl">
          <CardMedia
            activeImageIndex={activeImageIndex}
            alt={alt}
            backgroundImage={backgroundImage}
            backgroundImages={backgroundImages}
            emptyIcon={EmptyIcon}
            isEmpty={isEmpty}
            priority={priorityImage}
          />
          {!isEmpty && <div className="absolute inset-0 z-5 bg-black/20" />}
          <div
            className={`absolute inset-x-0 bottom-0 z-5 h-[55%] bg-linear-to-t ${
              isEmpty
                ? "from-gray-700/80 via-gray-600/40 to-transparent"
                : "from-black/95 via-black/60 to-transparent md:via-black/40"
            }`}
          />
          <div className="relative z-10 flex h-full flex-col">
            <div className="mt-auto w-full space-y-2 px-4 pb-4 pt-3 md:space-y-4 md:px-6 md:pb-6 md:pt-5">
              <div className="mb-1 flex items-center gap-2 text-white md:mb-2 md:gap-3">
                <Icon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 drop-shadow-text md:h-6 md:w-6"
                />
                <span className="line-clamp-3 text-sm font-bold drop-shadow-text md:text-xl">
                  {title}
                </span>
              </div>
              {children}
            </div>
          </div>
        </div>
      </motion.div>

      {hoverContent && (
        <CardHoverPopover
          activeImageIndex={activeImageIndex}
          alt={alt}
          backgroundImage={backgroundImage}
          backgroundImages={backgroundImages}
          emptyIcon={EmptyIcon}
          icon={Icon}
          isEmpty={isEmpty}
          isOpen={hover.isHovered && hover.shouldShowHoverContent}
          onMouseEnter={hover.handleMouseEnter}
          onMouseLeave={hover.handleMouseLeave}
          position={hover.popoverPosition}
          title={title}
        >
          {hoverContent}
        </CardHoverPopover>
      )}
    </>
  );
}

Card.Footer = Footer;
Card.HoverContent = HoverContent;

export { Card };
