import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BANNER_MEDIA_POSITION,
  COMPACT_BANNER_SIZE,
} from "@/components/common/media/BannerShell";
import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";
import { Content } from "@/lib/types";
import { navigateToContentById } from "@/lib/utils/navigationUtils";
import { useBannerAutoRotation } from "./hooks/useBannerAutoRotation";
import { useBannerGestures } from "./hooks/useBannerGestures";
import { getBestImageUrl } from "./utils";
import { BannerContent } from "./components/BannerContent";
import { BannerControls } from "./components/BannerControls";

interface FeaturedBannerProps {
  items: Content[];
  autoRotateMs?: number;
}

export function FeaturedBanner({ items, autoRotateMs = 5000 }: FeaturedBannerProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const autoplayAvailable = !shouldReduceMotion && !userPaused;

  const validItems = useMemo(
    () => items.filter((item) =>
      Boolean(item.denn_id && getBestImageUrl(item)),
    ),
    [items]
  );

  const { index, setIndex } = useBannerAutoRotation({
    itemCount: validItems.length,
    autoRotateMs,
    enabled: autoplayAvailable,
    interactionPaused,
  });

  const showPrevious = useCallback(() => {
    setIndex((currentIndex) =>
      (currentIndex - 1 + validItems.length) % validItems.length
    );
  }, [setIndex, validItems.length]);

  const showNext = useCallback(() => {
    setIndex((currentIndex) => (currentIndex + 1) % validItems.length);
  }, [setIndex, validItems.length]);

  const gestures = useBannerGestures({
    onPrevious: showPrevious,
    onNext: showNext,
  });

  const handleViewDetails = (item: Content) => {
    if (item.denn_id) navigateToContentById(navigate, item.denn_id);
  };

  if (validItems.length === 0) return null;

  const current = validItems[index];
  const currentImage = getBestImageUrl(current);

  return (
    <section
      data-banner-shell
      aria-roledescription="carousel"
      aria-label="Featured content"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onTouchStart={gestures.handleTouchStart}
      onTouchEnd={gestures.handleTouchEnd}
      onTouchCancel={gestures.handleTouchCancel}
      onWheel={gestures.handleWheel}
      className={`layout-banner group relative mb-6 touch-pan-y overflow-hidden md:mb-10 md:rounded-2xl ${COMPACT_BANNER_SIZE}`}
    >
      <div id="featured-slide" role="tabpanel" className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            className="absolute inset-0"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {currentImage && (
              <ResponsiveMedia
                src={currentImage}
                alt={`${current.title} featured artwork`}
                width={1600}
                height={900}
                sizes="100vw"
                priority
                className={`h-full w-full object-cover ${BANNER_MEDIA_POSITION}`}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 bg-black/35 z-20" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/50 to-transparent z-20" />
      <div
        className="absolute inset-x-0 bottom-0 z-20 h-20 md:h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--color-background-logged-in) 100%)",
        }}
      />

      <BannerContent item={current} onViewDetails={handleViewDetails} />

      <BannerControls
        itemCount={validItems.length}
        currentIndex={index}
        onPrevious={showPrevious}
        onNext={showNext}
        isPaused={userPaused || Boolean(shouldReduceMotion)}
        canToggleAutoplay={!shouldReduceMotion}
        onPauseToggle={() => setUserPaused((paused) => !paused)}
      />
    </section>
  );
}
