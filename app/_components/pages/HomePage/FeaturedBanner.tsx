"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Film, Tv, Gamepad2, Book, Music } from "lucide-react";
import { Button } from "@/app/_components/lib/button";
import { ContentItem } from "@/types/contentTypes";

type FeaturedBannerProps = {
  items: ContentItem[];
  autoRotateMs?: number;
};

const TYPE_ICON: Record<string, any> = {
  movie: Film,
  tv: Tv,
  game: Gamepad2,
  book: Book,
  music: Music,
};

function getItemType(item: ContentItem): keyof typeof TYPE_ICON {
  if ("type" in item && typeof (item as any).type === "string") {
    const t = (item as any).type as string;
    if (t === "movie") return "movie";
    if (t === "tv") return "tv";
    if (t === "album" || t === "music") return "music";
  }
  if ("platforms" in item) return "game";
  if ("pages" in item) return "book";
  if ("total_tracks" in item) return "music";
  return "movie";
}

export default function FeaturedBanner({ items, autoRotateMs = 6000 }: FeaturedBannerProps) {

  const getBestImageUrl = (item: any): string | undefined => {
    if (item && item.images) {
      const images = item.images as any;

      const tryPickFromArray = (arr?: any[]): string | undefined => {
        if (!Array.isArray(arr)) return undefined;

        for (const entry of arr) {
          if (entry?.original) return entry.original as string;
        }

        for (const entry of arr) {
          if (entry?.standard) return entry.standard as string;
        }

        return undefined;
      };

      const tryPickFromMap = (mapObj: any, keys: string[]): string | undefined => {
        for (const key of keys) {
          const bucket = mapObj?.[key];
          if (!bucket) continue;

          if (typeof bucket === "object") {
            if (bucket.original) return bucket.original as string;
            const firstVal = Object.values(bucket).find((v) => typeof v === "string" && v);
            if (typeof firstVal === "string") return firstVal as string;
          }
        }

        for (const value of Object.values(mapObj || {})) {
          if (value && typeof value === "object") {
            if ((value as any).original) return (value as any).original as string;
            const firstVal = Object.values(value as any).find((v) => typeof v === "string" && v);
            if (typeof firstVal === "string") return firstVal as string;
          }
        }

        return undefined;
      };

      if (Array.isArray(images?.screenshots) || Array.isArray(images?.artworks) || images?.poster) {
        return (
          tryPickFromArray(images.screenshots) ||
          tryPickFromArray(images.artworks) ||
          (images.poster?.original || images.poster?.standard)
        );
      }

      const fromMap = tryPickFromMap(images, ["backdrop", "backdrops", "stills", "fanart", "landscape"]);
      if (fromMap) return fromMap;
    }

    return item?.image_url || undefined;
  };

  const validItems = useMemo(
    () => items.filter((i) => Boolean(getBestImageUrl(i))),
    [items]
  );
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // auto rotate
  useEffect(() => {
    if (validItems.length <= 1) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      () => setIndex((i) => (i + 1) % validItems.length),
      autoRotateMs
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [index, validItems.length, autoRotateMs]);

  // Navigation via dots only (no arrow buttons)

  if (validItems.length === 0) return null;

  const current = validItems[index];
  const Icon = TYPE_ICON[getItemType(current)];
  const backgroundUrl = getBestImageUrl(current);

  const getFooterInfo = (item: ContentItem): string => {
    const parts: string[] = [];
    if ("pages" in item && item.pages) {
      parts.push(`${item.pages} pages`);
    }
    if ("total_tracks" in item && item.total_tracks) {
      parts.push(`${item.total_tracks} ${item.total_tracks === 1 ? "track" : "tracks"}`);
    }
    return parts.join(" · ");
  };

  const getAuthors = (item: ContentItem): string => {
    if ("authors" in item && item.authors && item.authors.length > 0) {
      return item.authors.join(", ");
    }
    return "";
  };

  const getReleaseDate = (item: ContentItem): string => {
    if ("release_date" in item && item.release_date) {
      return item.release_date as string;
    }
    return "";
  };

  const getOriginalTitle = (item: ContentItem): string => {
    if ("original_title" in item && item.original_title) {
      return item.original_title as string;
    }
    return "";
  };

  const footerInfo = getFooterInfo(current);
  const authors = getAuthors(current);
  const originalTitle = getOriginalTitle(current);
  const releaseDate = getReleaseDate(current);
  const originalTitleIsSame =
    originalTitle && originalTitle.toLowerCase() === current.title.toLowerCase();

  return (
    <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl">
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={(current as any).id}
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
          initial={{ opacity: 0.3, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </AnimatePresence>

      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-black/35" />
      {/* Fade up (content legibility) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/50 to-transparent" />
      {/* Fade down (blend into app background) */}
      <div
        className="absolute inset-x-0 bottom-0 h-28 md:h-36"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, var(--color-background-logged-in) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-30 h-full flex items-end">
        <div className="w-full px-4 md:px-12 pb-16 md:pb-20">
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            {Icon && <Icon className="w-6 h-6 md:w-8 md:h-8 text-white/90" />}
            <h2 className="text-white font-extrabold text-2xl sm:text-3xl md:text-5xl drop-shadow-text line-clamp-2">
              {current.title}
            </h2>
          </div>
          {/* Metadata */}
          <div className="mt-2 md:mt-3 text-white/85 space-y-1 font-sans">
            {originalTitle && !originalTitleIsSame && (
              <div className="text-sm md:text-base opacity-90">{originalTitle}</div>
            )}
            {authors && (
              <div className="text-xs md:text-sm opacity-90">{authors}</div>
            )}
            {releaseDate && (
              <div className="text-xs md:text-sm opacity-90">{releaseDate}</div>
            )}
            {footerInfo && (
              <div className="text-xs md:text-sm opacity-90">{footerInfo}</div>
            )}
          </div>

          {"description" in current && current.description && (
            <p className="mt-2 md:mt-3 text-white/90 max-w-3xl line-clamp-3 md:line-clamp-2 md:text-base font-sans text-xs">
              {(current as any).description}
            </p>
          )}
          <div className="mt-3 md:mt-5 flex items-center gap-3">
            <Button className="bg-white text-black hover:bg-white/90 cursor-pointer text-xs md:text-sm">
              View details <span className="ml-2">-&gt;</span>
            </Button>
          </div>
        </div>
      </div>

      {/* No arrow buttons - navigation via dots only */}

      {/* Dots */}
      {validItems.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-8 z-20 flex gap-2">
          {validItems.map((_, i) => (
            <button
              key={`dot-${i}`}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === index ? "bg-white scale-110" : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


