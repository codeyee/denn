import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Noise } from "@/components/common/Noise";
import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";
import { Content } from "@/lib/types";
import { navigateToContentById } from "@/lib/utils/navigationUtils";
import { useSettings } from "@/hooks/useSettings";
import { useBannerAutoRotation } from "./hooks/useBannerAutoRotation";
import { getBestImageUrl } from "./utils";
import { BannerContent } from "./components/BannerContent";
import { BannerDots } from "./components/BannerDots";

interface FeaturedBannerProps {
  items: Content[];
  autoRotateMs?: number;
}

export function FeaturedBanner({ items, autoRotateMs = 5000 }: FeaturedBannerProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { settings } = useSettings();
  const [interactionPaused, setInteractionPaused] = useState(false);
  const autoplayAvailable = settings.animationsEnabled && !shouldReduceMotion;

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

  const handleViewDetails = (item: Content) => {
    if (item.denn_id) navigateToContentById(navigate, item.denn_id);
  };

  if (validItems.length === 0) return null;

  const current = validItems[index];
  const currentImage = getBestImageUrl(current);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured content"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setInteractionPaused(false);
        }
      }}
      className="group relative mb-6 aspect-[4/5] w-full overflow-hidden md:mb-10 md:aspect-[16/11] md:rounded-2xl lg:aspect-[16/9] xl:aspect-[16/7]"
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
                className="h-full w-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 pointer-events-none z-10">
        <Noise patternAlpha={15} patternRefreshInterval={2} />
      </div>

      <div className="absolute inset-0 bg-black/35 z-20" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/50 to-transparent z-20" />
      <div
        className="absolute inset-x-0 bottom-0 h-28 md:h-36 z-20"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--color-background-logged-in) 100%)",
        }}
      />

      <BannerContent item={current} onViewDetails={handleViewDetails} />

      <BannerDots
        itemCount={validItems.length}
        currentIndex={index}
        onIndexChange={setIndex}
        onPrevious={() =>
          setIndex((currentIndex) =>
            (currentIndex - 1 + validItems.length) % validItems.length
          )
        }
        onNext={() =>
          setIndex((currentIndex) => (currentIndex + 1) % validItems.length)
        }
      />
    </section>
  );
}
