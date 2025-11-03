import { motion, AnimatePresence } from "motion/react";
import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";

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
}

interface CardFooterProps {
  children?: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: CardFooterProps) {
  return (
    <div
      className={`flex items-center gap-1 text-[10px] md:text-xs text-white/80 font-sans drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)] ${className}`}
    >
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
}: CardProps) {
  const Icon = icon || (type ? ICON_MAP[type] : Film);
  const EmptyIcon = emptyIcon || Icon;

  return (
    <motion.div
      key={id}
      className={`w-full ${className}`}
      style={noAspectRatio ? undefined : { aspectRatio: DEFAULT_CARD_ASPECT_RATIO }}
    >
      <div className="relative overflow-hidden rounded-2xl h-full bg-transparent backdrop-blur-lg p-0! border-none!">
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
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </AnimatePresence>
        )}

        {/* Overlay layer */}
        {!isEmpty && <div className="absolute inset-0 bg-black/20" />}
        <div 
          className={`absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t ${
            isEmpty
              ? 'from-gray-700/80 via-gray-600/40 to-transparent'
              : 'from-black/95 via-black/40 to-transparent'
          }`}
        />

        {/* Content layer */}
        <div className="relative z-10 h-full flex flex-col">
          <div className="mt-auto w-full px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-5 space-y-2 md:space-y-4">
            {/* Title section */}
            <div className="flex items-center gap-2 md:gap-3 text-white mb-1 md:mb-2">
              <Icon className="w-5 h-5 md:w-6 md:h-6 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]" />
              <span className="text-base md:text-xl font-bold drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)] line-clamp-2">
                {title}
              </span>
            </div>

            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

Card.Footer = Footer;

export default Card;
