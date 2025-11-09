"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Film, Tv, Gamepad2, Book, Music } from "lucide-react";
import { Button } from "@/app/_components/lib/button";
import { ContentItem } from "@/types/contentTypes";
import { SourceApi, ContentType } from "@/lib/api/types";
import { getLegacyImageUrl } from "@/lib/utils/imageUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import Noise from "@/app/_components/lib/Animations/Noise";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

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
    const t = (item as any).type.toLowerCase();
    if (t === "movie") return "movie";
    if (t === "tv" || t === "tv_show") return "tv";
    if (t === "game") return "game";
    if (t === "book") return "book";
    if (t === "album" || t === "music") return "music";
  }
  if ("number_of_seasons" in item || "number_of_episodes" in item) {
    return "tv";
  }
  if ("platforms" in item) return "game";
  if ("pages" in item) return "book";
  if ("total_tracks" in item) return "music";
  return "movie";
}

export default function FeaturedBanner({ items, autoRotateMs = 6000 }: FeaturedBannerProps) {
  const router = useRouter();

  const handleViewDetails = (item: ContentItem) => {

    // Navigate instantly with external identifiers - the detail page will handle API calls
    let sourceApi: SourceApi | undefined;
    let contentType: ContentType | undefined;
    let externalId: string | number | undefined;

    // First check if there's an explicit type field (from search results)
    if ("type" in item && typeof item.type === "string") {
      const itemType = item.type.toLowerCase();
      if (itemType === "movie") {
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.MOVIE;
        externalId = String(item.id);
      } else if (itemType === "tv" || itemType === "tv_show") {
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.TV_SHOW;
        externalId = String(item.id);
      } else if (itemType === "album" || itemType === "music" || itemType === "ep") {
        sourceApi = SourceApi.SPOTIFY;
        contentType = ContentType.ALBUM;
        externalId = String(item.id);
      } else if (itemType === "game") {
        sourceApi = SourceApi.IGDB;
        contentType = ContentType.GAME;
        externalId = String(item.id);
      } else if (itemType === "book") {
        sourceApi = SourceApi.OPENLIBRARY;
        contentType = ContentType.BOOK;
        externalId = String(item.id);
      }
    }

    // If not determined by type field, check properties
    if (!sourceApi || !contentType) {
      if ("platforms" in item) {
        sourceApi = SourceApi.IGDB;
        contentType = ContentType.GAME;
        externalId = String(item.id);
      } else if ("total_tracks" in item) {
        sourceApi = SourceApi.SPOTIFY;
        contentType = ContentType.ALBUM;
        externalId = String(item.id);
      } else if ("pages" in item) {
        sourceApi = SourceApi.OPENLIBRARY;
        contentType = ContentType.BOOK;
        externalId = String(item.id);
      } else if ("number_of_seasons" in item || "number_of_episodes" in item) {
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.TV_SHOW;
        externalId = String(item.id);
      } else {
        // Default to movie
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.MOVIE;
        externalId = String(item.id);
      }
    }

    if (sourceApi && contentType && externalId) {
      // Navigate immediately with query parameters - the detail page will handle API calls
      const params = new URLSearchParams({
        external_id: String(externalId),
        source_api: sourceApi,
        content_type: contentType,
      });
      router.push(`/content?${params.toString()}`);
    }
  };

  const getBestImageUrl = (item: any): string | undefined => {
    return getLegacyImageUrl(item);
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
    return parts.join(" • ");
  };

  const getAuthors = (item: ContentItem): string => {
    if ("authors" in item && item.authors && item.authors.length > 0) {
      // Show only the first author
      const firstAuthor = item.authors[0];
      if (typeof firstAuthor === "string") {
        return firstAuthor;
      } else if (firstAuthor && "name" in firstAuthor) {
        return firstAuthor.name;
      }
    }
    return "";
  };

  const getReleaseDate = (item: ContentItem): string => {
    if ("release_date" in item && item.release_date) {
      return formatReleaseDate(item.release_date as string);
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

  // Extra info specific to type: duration (movies/albums) and TV counts
  const getExtraInfo = (item: any): string => {
    const extra: string[] = [];
    if (typeof item?.duration_minutes === 'number' && item.duration_minutes > 0) {
      extra.push(`${item.duration_minutes} min`);
    }
    const seasons = item?.number_of_seasons as number | undefined;
    const episodes = item?.number_of_episodes as number | undefined;
    if (seasons || episodes) {
      const parts: string[] = [];
      if (typeof seasons === 'number' && seasons > 0) {
        parts.push(`${seasons} ${seasons === 1 ? 'season' : 'seasons'}`);
      }
      if (typeof episodes === 'number' && episodes > 0) {
        parts.push(`${episodes} ${episodes === 1 ? 'episode' : 'episodes'}`);
      }
      if (parts.length) extra.push(parts.join(' • '));
    }
    return extra.join(' • ');
  };
  const extraInfo = getExtraInfo(current);

  return (
    <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 4xl:aspect-16/5 15xl:aspect-16/3 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl">
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

      {/* Noise layer */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <Noise
          patternAlpha={15}
          patternRefreshInterval={2}
        />
      </div>

      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-black/35 z-20" />
      {/* Fade up (content legibility) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/50 to-transparent z-20" />
      {/* Fade down (blend into app background) */}
      <div
        className="absolute inset-x-0 bottom-0 h-28 md:h-36 z-20"
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
            {extraInfo && (
              <div className="text-xs md:text-sm opacity-90">{extraInfo}</div>
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
            <Button 
              onClick={() => handleViewDetails(current)}
              className="bg-white text-black hover:bg-white/90 cursor-pointer text-xs md:text-sm"
            >
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


