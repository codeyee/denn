
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SourceApi, Author, ContentType } from "@/lib/types";
import { getBannerImageUrl } from "@/lib/utils/imageUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { buildContentUrlById } from "@/lib/utils/navigationUtils";
import { contentItemActions } from "@/lib/api";
import { CONTENT_TYPE_ICONS } from "@/lib/icons/contentTypeIcons";
import { Content } from "@/lib/types";
import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";
import {
  BANNER_MEDIA_POSITION,
  BannerShell,
} from "@/components/common/media/BannerShell";
import { ContentActions } from "./ContentActions";

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
    if (!isAuthenticated || !tvShowExternalId) return;
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
  }, [isAuthenticated, tvShowExternalId]);

  return (
    <BannerShell
      media={
        backgroundUrl ? (
          <ResponsiveMedia
            src={backgroundUrl}
            alt={`${displayTitle} artwork`}
            width={1600}
            height={900}
            sizes="100vw"
            priority
            className={`absolute inset-0 h-full w-full object-cover ${BANNER_MEDIA_POSITION}`}
          />
        ) : undefined
      }
      fallback={
        Icon ? (
          <Icon className="h-16 w-16 text-gray-400 opacity-50 md:h-24 md:w-24" />
        ) : null
      }
    >
      <div className="w-full px-4 pb-10 md:px-12 md:pb-12">
          <div className="flex items-center gap-3 mb-1 md:mb-2">
            {Icon && <Icon className="h-6 w-6 text-white/90 md:h-7 md:w-7" />}
            <h1 className="line-clamp-2 text-balance text-2xl font-extrabold text-white drop-shadow-text sm:text-3xl md:text-4xl">
              {displayTitle}
            </h1>
          </div>
          {/* Subtitle: TV show name (seasons), Authors (albums/books), Original title (movies/TV) */}
          {isSeason && tvShowName ? (
            <div className="mt-1 font-sans text-sm text-white/85 opacity-90 md:mt-2 md:text-base">
              {tvShowUrl ? (
                <Link to={tvShowUrl} className="hover:text-white hover:underline transition-colors">
                  {tvShowName}
                </Link>
              ) : tvShowName}
            </div>
          ) : (isAlbum || isBook) && authors ? (
            <div className="mt-1 font-sans text-sm text-white/85 opacity-90 md:mt-2 md:text-base">
              {authors}
            </div>
          ) : originalTitle && !originalTitleIsSame ? (
            <div className="mt-1 font-sans text-sm text-white/85 opacity-90 md:mt-2 md:text-base">
              {originalTitle}
            </div>
          ) : null}

          <ContentActions
            isAuthenticated={isAuthenticated}
            hasUserRating={hasUserRating}
            onAddToList={onAddToList}
            onRateContent={onRateContent}
          />
      </div>
    </BannerShell>
  );
}
