import { motion, AnimatePresence } from "motion/react";

import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";

import SpotlightCard from "@/app/_components/ui/SpotlightCard/SpotlightCard";

import { contentTypeEnum } from "@/types/types";

interface Prop {
  className?: string;
  backgroundImage?: string;
  backgroundImageAlt?: string;
  id: string | number;
  type?: contentTypeEnum;
  title: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyBackgroundColor?: string;
}

interface FooterProp {
  children?: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: FooterProp) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-white/80 font-sans drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

function Card({
  type,
  className = "",
  backgroundImage,
  backgroundImageAlt,
  id,
  title,
  icon,
  children,
  isEmpty = false,
  emptyIcon,
  emptyBackgroundColor = "#374151",
}: Prop) {
  const iconMap = {
    movie: Film,
    tv: Tv,
    game: Gamepad2,
    book: Book,
    music: Music,
  };

  const Icon = icon || (type ? iconMap[type] : Film);
  const EmptyIcon = emptyIcon || Icon;

  return (
    <motion.div
      key={id}
      className={`w-full md:basis-1/2 md:max-w-[360px] ${className}`}
    >
      <SpotlightCard
        className="relative overflow-hidden rounded-2xl h-[240px] md:h-[480px] bg-transparent backdrop-blur-lg p-0! border-none!"
        spotlightColor="rgba(255, 255, 255, 0.1)"
      >
        {/* Background image or empty state */}
        {isEmpty ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: emptyBackgroundColor }}
            aria-label={backgroundImageAlt || "Empty list"}
          >
            {EmptyIcon && (
              <EmptyIcon className="w-24 h-24 md:w-32 md:h-32 text-gray-400 opacity-50" />
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
        {!isEmpty && <div className="absolute inset-0 bg-black/20" />}
        <div className={`absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t ${isEmpty ? 'from-gray-700/80 via-gray-600/40 to-transparent' : 'from-black/95 via-black/40 to-transparent'}`} />

        {/* Foreground content */}
        <div className="relative z-10 h-full flex flex-col">
          <div className="mt-auto w-full px-6 pb-6 pt-5 space-y-4">
            <div className="flex items-center gap-3 text-white mb-2">
              <Icon className="w-6 h-6 shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]" />
              <span className="text-xl font-bold drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)]">
                {title}
              </span>
            </div>

            {children}
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

Card.Footer = Footer;

export default Card;
