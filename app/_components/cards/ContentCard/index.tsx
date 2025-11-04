"use client";

import { useRouter } from "next/navigation";
import Card from "../Card";
import { contentTypeEnum } from "@/types/types";
import { ContentItem } from "@/types/contentTypes";
import { SourceApi, ContentType } from "@/lib/api/types";

interface ContentCardProps {
  item: ContentItem;
  className?: string;
  contentItemId?: number; // Optional internal content item ID
}

export default function ContentCard({ item, className, contentItemId }: ContentCardProps) {
  const router = useRouter();

  const handleClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // If we have a content item ID, navigate directly
    if (contentItemId) {
      router.push(`/content/${contentItemId}`);
      return;
    }

    // Otherwise, navigate with external identifiers - the detail page will handle the API calls
    // Determine source API and content type from the item
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
      } else if (itemType === "season") {
        // For seasons, use the explicit external_id, source_api, and content_type if available
        if ("external_id" in item && item.external_id) {
          sourceApi = ("source_api" in item && item.source_api) as SourceApi || SourceApi.TMDB;
          contentType = ("content_type" in item && item.content_type) as ContentType || ContentType.SEASON;
          externalId = String(item.external_id);
        } else {
          sourceApi = SourceApi.TMDB;
          contentType = ContentType.SEASON;
          externalId = String(item.id);
        }
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
    } else {
      console.error("Missing required parameters:", { sourceApi, contentType, externalId });
      alert("Unable to determine content type. Please try again.");
    }
  };
  const getContentType = (): contentTypeEnum => {
    if ("type" in item && typeof item.type === "string") {
      if (item.type === "movie") return contentTypeEnum.movie;
      if (item.type === "tv" || item.type === "tv_show") return contentTypeEnum.tv;
      if (item.type === "album") return contentTypeEnum.music;
      if (item.type === "season") return contentTypeEnum.tv; // Seasons use TV icon
    }

    if ("number_of_seasons" in item || "number_of_episodes" in item) {
      return contentTypeEnum.tv;
    }

    if ("platforms" in item) return contentTypeEnum.game;
    if ("pages" in item) return contentTypeEnum.book;
    if ("total_tracks" in item) return contentTypeEnum.music;

    return contentTypeEnum.movie;
  };

  const getPosterImageUrl = (item: any): string | undefined => {
    if (item?.image_url) {
      return item.image_url;
    }

    if (item?.images) {
      const images = item.images as any;

      if (images.poster) {
        if (images.poster.original) return images.poster.original;
        if (images.poster.standard) return images.poster.standard;
      }

      if (Array.isArray(images.screenshots) && images.screenshots.length > 0) {
        const first = images.screenshots[0];
        if (first?.original) return first.original;
        if (first?.standard) return first.standard;
      }

      if (Array.isArray(images.artworks) && images.artworks.length > 0) {
        const first = images.artworks[0];
        if (first?.original) return first.original;
        if (first?.standard) return first.standard;
      }
    }

    return undefined;
  };

  const getFooterInfo = (): string => {
    const footerInfo: string[] = [];

    if ("pages" in item && item.pages) {
      footerInfo.push(`${item.pages} pages`);
    }

    if ("total_tracks" in item && item.total_tracks) {
      footerInfo.push(`${item.total_tracks} ${item.total_tracks === 1 ? 'track' : 'tracks'}`);
    }

    if ("duration_minutes" in item && (item as any).duration_minutes) {
      const mins = (item as any).duration_minutes as number;
      footerInfo.push(`${mins} min`);
    }

    // For seasons, show episode count
    if ("type" in item && item.type === "season") {
      const episodes = ("number_of_episodes" in item ? (item as any).number_of_episodes : undefined) as number | undefined;
      if (typeof episodes === 'number' && episodes > 0) {
        footerInfo.push(`${episodes} ${episodes === 1 ? 'episode' : 'episodes'}`);
      }
    } else {
      // For TV shows, show both seasons and episodes
      const seasons = ("number_of_seasons" in item ? (item as any).number_of_seasons : undefined) as number | undefined;
      const episodes = ("number_of_episodes" in item ? (item as any).number_of_episodes : undefined) as number | undefined;
      if (seasons || episodes) {
        const parts: string[] = [];
        if (typeof seasons === 'number' && seasons > 0) {
          parts.push(`${seasons} ${seasons === 1 ? 'season' : 'seasons'}`);
        }
        if (typeof episodes === 'number' && episodes > 0) {
          parts.push(`${episodes} ${episodes === 1 ? 'episode' : 'episodes'}`);
        }
        if (parts.length) footerInfo.push(parts.join(' • '));
      }
    }

    return footerInfo.join(" • ");
  };

  const getAuthors = (): string => {
    if ("authors" in item && item.authors && item.authors.length > 0) {
      return item.authors.join(", ");
    }
    return "";
  };


  const getReleaseDate = (): string => {
    if ("release_date" in item && item.release_date) {
      return item.release_date;
    }
    return "";
  };

  const getOriginalTitle = (): string => {
    if ("original_title" in item && item.original_title) {
      return item.original_title;
    }
    return "";
  };

  const title = item.title;
  const imageUrl = getPosterImageUrl(item);
  const id = String(item.id);
  const type = getContentType();

  const footerInfo = getFooterInfo();
  const authors = getAuthors();
  const originalTitle = getOriginalTitle();
  const releaseDate = getReleaseDate();

  const originalTitleIsSameAsTitle = originalTitle.toLowerCase() === title.toLowerCase();

  return (
    <div 
      onClick={handleClick} 
      className={`cursor-pointer ${className || ""}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          handleClick();
        }
      }}
      aria-label={`View details for ${title}`}
    >
      <Card
        type={type}
        id={id}
        title={title}
        backgroundImage={imageUrl || ""}
        backgroundImageAlt={`${title} cover image`}
        isEmpty={!imageUrl}
      >
        <Card.Footer>
          <div className="flex flex-col gap-1.5">
            {originalTitle && !originalTitleIsSameAsTitle && <div>{originalTitle}</div>}
            {authors && <div>{authors}</div>}
            {releaseDate && <div>{releaseDate}</div>}
            {footerInfo && <div>{footerInfo}</div>}
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
}
