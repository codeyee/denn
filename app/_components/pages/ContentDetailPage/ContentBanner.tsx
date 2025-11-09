"use client";

import { useRouter } from "next/navigation";
import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { ContentItem } from "@/types/contentTypes";
import { SourceApi, ContentType } from "@/lib/api/types";
import { getLegacyImageUrl } from "@/lib/utils/imageUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";

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

interface ContentBannerProps {
  item: ContentItem | any;
  tvShowTitle?: string;
  externalId?: string;
  sourceApi?: SourceApi | string;
}

export default function ContentBanner({ item, tvShowTitle, externalId, sourceApi }: ContentBannerProps) {
  const router = useRouter();
  const Icon = TYPE_ICON[getItemType(item)];
  const backgroundUrl = getLegacyImageUrl(item);

  const getOriginalTitle = (item: ContentItem | any): string => {
    if ("original_title" in item && item.original_title) {
      return item.original_title as string;
    }
    return "";
  };

  const getAuthors = (item: ContentItem | any): string => {
    if ("authors" in item && item.authors) {
      return formatAuthors(item.authors);
    }
    return "";
  };

  const originalTitle = getOriginalTitle(item);
  const originalTitleIsSame =
    originalTitle && originalTitle.toLowerCase() === item.title.toLowerCase();

  // For albums and books, show authors/artists as metadata
  const authors = getAuthors(item);
  const isAlbum = "total_tracks" in item;
  const isBook = "pages" in item;
  const isSeason = ("type" in item && item.type === "season") ||
    ("number_of_episodes" in item && !("number_of_seasons" in item));

  // Build TV show URL for season subtitle
  const getTVShowUrl = (): string | null => {
    if (!isSeason || !externalId || !sourceApi) return null;

    const [tvId] = externalId.split(":");
    if (!tvId) return null;

    const params = new URLSearchParams({
      external_id: tvId,
      source_api: String(sourceApi).toLowerCase(),
      content_type: ContentType.TV_SHOW,
    });

    return `/content?${params.toString()}`;
  };

  const tvShowUrl = getTVShowUrl();

  if (!backgroundUrl) {
    return (
      <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 4xl:aspect-16/5 15xl:aspect-16/3 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl bg-gray-800 flex items-center justify-center">
        {Icon && <Icon className="w-16 h-16 md:w-24 md:h-24 text-gray-400 opacity-50" />}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 4xl:aspect-16/5 15xl:aspect-16/3 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl">
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
          {/* Original Title (for movies/TV), Authors/Artists (for albums/books), or TV Show Name (for seasons) */}
          {isSeason && (item.tv_show_name || tvShowTitle) ? (
            <div className="mt-2 md:mt-3 text-white/85 text-sm md:text-base opacity-90 font-sans">
              {tvShowUrl ? (
                <button
                  onClick={() => router.push(tvShowUrl)}
                  className="hover:text-white underline transition-colors cursor-pointer"
                >
                  {item.tv_show_name || tvShowTitle}
                </button>
              ) : (
                <span>{item.tv_show_name || tvShowTitle}</span>
              )}
            </div>
          ) : (isAlbum || isBook) && authors ? (
            <div className="mt-2 md:mt-3 text-white/85 text-sm md:text-base opacity-90 font-sans">
              {authors}
            </div>
          ) : originalTitle && !originalTitleIsSame ? (
            <div className="mt-2 md:mt-3 text-white/85 text-sm md:text-base opacity-90 font-sans">
              {originalTitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

