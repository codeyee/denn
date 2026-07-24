import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";

interface CardMediaProps {
  activeImageIndex: number;
  alt: string;
  backgroundImage?: string;
  backgroundImages?: string[];
  emptyIcon: LucideIcon;
  isEmpty: boolean;
  priority?: boolean;
}

export function CardMedia({
  activeImageIndex,
  alt,
  backgroundImage,
  backgroundImages,
  emptyIcon: EmptyIcon,
  isEmpty,
  priority = false,
}: CardMediaProps) {
  const source =
    backgroundImages && backgroundImages.length > 0
      ? backgroundImages[activeImageIndex % backgroundImages.length]
      : backgroundImage;

  if (isEmpty || !source) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-empty-card">
        <EmptyIcon
          aria-hidden="true"
          className="h-16 w-16 text-gray-300 opacity-60 md:h-20 md:w-20"
        />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={source}
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ResponsiveMedia
          src={source}
          alt={alt}
          width={500}
          height={800}
          sizes="(max-width: 639px) 44vw, (max-width: 1023px) 30vw, 250px"
          priority={priority}
          className="h-full w-full object-cover"
        />
      </motion.div>
    </AnimatePresence>
  );
}
