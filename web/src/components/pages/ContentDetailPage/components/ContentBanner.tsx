
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SourceApi, Author, ContentType } from "@/lib/types";
import { getBannerImageUrl } from "@/lib/utils/imageUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { buildContentUrlById } from "@/lib/utils/navigationUtils";
import { contentItemActions } from "@/lib/api";
import { CONTENT_TYPE_ICONS } from "@/lib/icons/contentTypeIcons";
import { Button } from "@/components/common/ui/Button";
import { ListPlus, Star } from "lucide-react";
import { Content } from "@/lib/types";

interface ContentBannerProps {
  item: Content;
  tvShowTitle?: string;
  externalId?: string;
  sourceApi?: SourceApi | string;
  onAddToList?: () => void;
  onRateContent?: () => void;
  isAuthenticated?: boolean;
  hasUserRating?: boolean;
}

export function ContentBanner({
  item,
  tvShowTitle,
  externalId,
  onAddToList,
  onRateContent,
  isAuthenticated,
  hasUserRating,
}: ContentBannerProps) {
  // `item.type` comes from the proxy detail payload (uppercase content type
  // like "MOVIE"). When the payload failed to load we still receive a bare
  // ContentItem-shaped object, so we coerce safely instead of crashing.
  const rawType = (
    ("type" in item && item.type) ||
    ("content_type" in item && (item as { content_type?: string }).content_type) ||
    ""
  ) as string;
  const normalizedType = rawType.toUpperCase();
  const Icon = CONTENT_TYPE_ICONS[normalizedType as ContentType];
  const backgroundUrl = getBannerImageUrl(item.images, item.image_url) || undefined;

  const getOriginalTitle = (item: Content): string => {
    if ("original_title" in item && item.original_title) {
      return item.original_title as string;
    }
    return "";
  };

  const getAuthors = (item: Content): string => {
    if ("authors" in item && item.authors) {
      return formatAuthors(item.authors as Author[]);
    }
    return "";
  };

  const itemTitle = ("title" in item && item.title) ? item.title : "";
  const originalTitle = getOriginalTitle(item);
  const originalTitleIsSame =
    originalTitle && itemTitle && originalTitle.toLowerCase() === itemTitle.toLowerCase();

  // For albums and books, show authors/artists as metadata
  const authors = getAuthors(item);
  const isAlbum = normalizedType === "ALBUM";
  const isBook = normalizedType === "BOOK";
  const isSeason = normalizedType === "SEASON";

  const displayTitle = itemTitle;
  const tvShowName = isSeason ? (('tv_show_name' in item && item.tv_show_name) || tvShowTitle) : null;
  const tvShowExternalId = isSeason && externalId ? externalId.split(":")[0] : null;
  const [tvShowUrl, setTvShowUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!tvShowExternalId) return;
    let cancelled = false;
    (async () => {
      try {
        const resolved = await contentItemActions.getOrCreate(
          tvShowExternalId,
          ContentType.TV_SHOW
        );
        if (!cancelled) {
          setTvShowUrl(buildContentUrlById(resolved.id));
        }
      } catch (error) {
        console.error("Failed to resolve TV show URL:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tvShowExternalId]);

  if (!backgroundUrl) {
    return (
      <div className="relative w-full aspect-16/16 md:aspect-16/13 lg:aspect-16/10 xl:aspect-16/7 4xl:aspect-16/5 15xl:aspect-16/3 overflow-hidden mb-6 md:mb-10 rounded-none md:rounded-2xl bg-gray-800 flex items-center justify-center">
        {Icon && (
          <Icon className="w-16 h-16 md:w-24 md:h-24 text-gray-400 opacity-50" />
        )}
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
            <h1 className="text-white font-extrabold text-2xl sm:text-3xl md:text-5xl drop-shadow-text line-clamp-3">
              {displayTitle}
            </h1>
          </div>
          {/* Subtitle: TV show name (seasons), Authors (albums/books), Original title (movies/TV) */}
          {isSeason && tvShowName ? (
            <div className="mt-2 md:mt-3 text-white/85 text-sm md:text-base opacity-90 font-sans">
              {tvShowUrl ? (
                <Link to={tvShowUrl} className="hover:text-white hover:underline transition-colors">
                  {tvShowName}
                </Link>
              ) : tvShowName}
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

          {/* Action Buttons */}
          {isAuthenticated && (onAddToList || onRateContent) && (
            <div className="mt-4 md:mt-6 flex gap-3">
              {onAddToList && (
                <Button
                  onClick={onAddToList}
                  className="flex items-center gap-2 cursor-pointer bg-white text-black hover:bg-white/90 font-semibold"
                  size="lg"
                >
                  <ListPlus className="w-5 h-5" />
                  Add to List
                </Button>
              )}
              {onRateContent && (
                <Button
                  onClick={onRateContent}
                  className={`flex items-center gap-2 cursor-pointer font-semibold ${
                    hasUserRating
                      ? ""
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                  size="lg"
                  variant={hasUserRating ? "outline" : "default"}
                >
                  <Star className="w-5 h-5" />
                  {hasUserRating ? "Edit Rating" : "Rate This"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
