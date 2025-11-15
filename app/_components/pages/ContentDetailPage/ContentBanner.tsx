"use client";

import { SourceApi, Author } from "@/lib/api/types";
import { getBannerImageUrl } from "@/lib/utils/imageUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { CONTENT_TYPE_ICONS } from "@/lib/utils/contentTypeIcons";
import { formatSeasonTitle } from "@/lib/utils/titleUtils";
import { Button } from "@/app/_components/common/ui/Button";
import { ListPlus, Star } from "lucide-react";
import { Content } from "@/types";

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
  onAddToList,
  onRateContent,
  isAuthenticated,
  hasUserRating,
}: ContentBannerProps) {
  const contentType = item.type;
  const Icon = CONTENT_TYPE_ICONS[contentType];
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

  const originalTitle = getOriginalTitle(item);
  const originalTitleIsSame =
    originalTitle && originalTitle.toLowerCase() === item.title.toLowerCase();

  // For albums and books, show authors/artists as metadata
  const authors = getAuthors(item);
  const isAlbum = item.type === "ALBUM";
  const isBook = item.type === "BOOK";
  const isSeason = item.type === "SEASON";

  // For seasons, format title to avoid redundancy
  const displayTitle = isSeason
    ? formatSeasonTitle(item.tv_show_name || tvShowTitle, item.title)
    : item.title;

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
          {/* Original Title (for movies/TV), Authors/Artists (for albums/books) - skip for seasons since TV show is in title */}
          {(isAlbum || isBook) && authors ? (
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
