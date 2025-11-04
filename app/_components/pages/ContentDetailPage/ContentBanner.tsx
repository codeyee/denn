"use client";

import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { ContentItem } from "@/types/contentTypes";

const TYPE_ICON: Record<string, LucideIcon> = {
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
  if ("number_of_seasons" in item || "number_of_episodes" in item) {
    return "tv";
  }
  if ("platforms" in item) return "game";
  if ("pages" in item) return "book";
  if ("total_tracks" in item) return "music";
  return "movie";
}

function getBestImageUrl(item: any): string | undefined {
  if (item && item.images) {
    const images = item.images as any;

    if (Array.isArray(images?.screenshots) || Array.isArray(images?.artworks) || images?.poster) {
      if (Array.isArray(images.artworks) && images.artworks.length > 0) {
        const first = images.artworks[0];
        if (first?.original) return first.original;
        if (first?.standard) return first.standard;
      }

      if (Array.isArray(images.screenshots) && images.screenshots.length > 0) {
        const first = images.screenshots[0];
        if (first?.original) return first.original;
        if (first?.standard) return first.standard;
      }

      if (images.backdrop) {
        if (images.backdrop.original) return images.backdrop.original;
        if (images.backdrop.standard) return images.backdrop.standard;
      }

      if (images.poster) {
        if (images.poster.original) return images.poster.original;
        if (images.poster.standard) return images.poster.standard;
      }
    }
  }

  return item?.image_url || undefined;
}

interface ContentBannerProps {
  item: ContentItem | any;
}

export default function ContentBanner({ item }: ContentBannerProps) {
  const Icon = TYPE_ICON[getItemType(item)];
  const backgroundUrl = getBestImageUrl(item);

  const getFooterInfo = (item: ContentItem | any): string => {
    const parts: string[] = [];
    if ("pages" in item && item.pages) {
      parts.push(`${item.pages} pages`);
    }
    if ("total_tracks" in item && item.total_tracks) {
      parts.push(`${item.total_tracks} ${item.total_tracks === 1 ? "track" : "tracks"}`);
    }
    return parts.join(" • ");
  };

  const getAuthors = (item: ContentItem | any): string => {
    if ("authors" in item && item.authors && item.authors.length > 0) {
      return item.authors.join(", ");
    }
    return "";
  };

  const getReleaseDate = (item: ContentItem | any): string => {
    if ("release_date" in item && item.release_date) {
      return item.release_date as string;
    }
    return "";
  };

  const getOriginalTitle = (item: ContentItem | any): string => {
    if ("original_title" in item && item.original_title) {
      return item.original_title as string;
    }
    return "";
  };

  const footerInfo = getFooterInfo(item);
  const authors = getAuthors(item);
  const originalTitle = getOriginalTitle(item);
  const releaseDate = getReleaseDate(item);
  const originalTitleIsSame =
    originalTitle && originalTitle.toLowerCase() === item.title.toLowerCase();

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
  const extraInfo = getExtraInfo(item);

  if (!backgroundUrl) {
    return (
      <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl bg-gray-800 flex items-center justify-center">
        {Icon && <Icon className="w-16 h-16 md:w-24 md:h-24 text-gray-400 opacity-50" />}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl">
      {/* Background */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
      />

      {/* Overlay gradients */}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/50 to-transparent" />
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
            <h1 className="text-white font-extrabold text-2xl sm:text-3xl md:text-5xl drop-shadow-text line-clamp-2">
              {item.title}
            </h1>
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

          {"description" in item && item.description && (
            <p className="mt-2 md:mt-3 text-white/90 max-w-3xl line-clamp-3 md:line-clamp-2 md:text-base font-sans text-xs">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

