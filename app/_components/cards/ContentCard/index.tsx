"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import Card from "../Card";
import { contentTypeEnum } from "@/types/types";
import { ContentItem } from "@/types/contentTypes";
import { SourceApi, ContentType } from "@/lib/api/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { getCardImageUrl } from "@/lib/utils/imageUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";

interface ContentCardProps {
  item: ContentItem;
  className?: string;
}

export default function ContentCard({ item, className }: ContentCardProps) {
  const router = useRouter();
  const middleClickHandled = useRef(false);

  const getNavigationUrl = (): string | null => {
    // Navigate with external identifiers - the detail page will handle the API calls
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
      return `/content?${params.toString()}`;
    } else {
      console.error("Missing required parameters:", { sourceApi, contentType, externalId });
      return null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const url = getNavigationUrl();
    if (!url) {
      alert("Unable to determine content type. Please try again.");
      return;
    }

    // Check for Ctrl/Cmd+click to open in new tab
    const isModifierClick = e.ctrlKey || e.metaKey;

    if (isModifierClick) {
      // Open in new tab without losing focus
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.blur();
        window.focus();
      }
    } else {
      // Navigate in same tab
      router.push(url);
    }
  };

  const openInNewTab = (url: string) => {
    // Store reference to current window
    const currentWindow = window;
    
    // Open the URL in a new tab
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    // Try to refocus the current window after a delay
    // Many browsers block this for security, but we try anyway
    if (newWindow) {
      // Use a delay to allow the tab to start loading
      setTimeout(() => {
        try {
          // Try to blur the new window
          newWindow.blur();
        } catch (e) {
          // Ignored - browser security restriction
        }
        // Try to focus the current window
        setTimeout(() => {
          try {
            currentWindow.focus();
          } catch (e) {
            // Ignored - browser security restriction
          }
        }, 50);
      }, 200);
    }
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    // Handle middle-click (button === 1) - onAuxClick fires for non-primary buttons
    if (e.button === 1) {
      e.preventDefault(); // Prevent default middle-click behavior
      e.stopPropagation();
      middleClickHandled.current = true;
      const url = getNavigationUrl();
      if (url) {
        openInNewTab(url);
      }
      // Reset the flag after a short delay
      setTimeout(() => {
        middleClickHandled.current = false;
      }, 100);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Handle middle-click (button === 1) as fallback for browsers that don't support onAuxClick
    if (e.button === 1 && !middleClickHandled.current) {
      e.preventDefault(); // Prevent default middle-click behavior (scrolling)
      e.stopPropagation();
      middleClickHandled.current = true;
      const url = getNavigationUrl();
      if (url) {
        openInNewTab(url);
      }
      // Reset the flag after a short delay
      setTimeout(() => {
        middleClickHandled.current = false;
      }, 100);
    }
  };
  const getContentType = (): contentTypeEnum => {
    if ("type" in item && typeof item.type === "string") {
      const itemType = item.type.toLowerCase();
      if (itemType === "movie") return contentTypeEnum.movie;
      if (itemType === "tv" || itemType === "tv_show") return contentTypeEnum.tv;
      if (itemType === "album" || itemType === "music") return contentTypeEnum.music;
      if (itemType === "season") return contentTypeEnum.tv; // Seasons use TV icon
      if (itemType === "game") return contentTypeEnum.game;
      if (itemType === "book") return contentTypeEnum.book;
    }

    if ("number_of_seasons" in item || "number_of_episodes" in item) {
      return contentTypeEnum.tv;
    }

    if ("pages" in item) return contentTypeEnum.book;
    if ("total_tracks" in item) return contentTypeEnum.music;

    // Movies have duration_minutes
    if ("duration_minutes" in item) return contentTypeEnum.movie;

    return contentTypeEnum.movie;
  };

  const getPosterImageUrl = (item: any): string | undefined => {
    // Use the new image utility that handles both old and new image structures
    return getCardImageUrl(item?.images, item?.image_url) || undefined;
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
      // For movies, TV shows, and games, show only the first author
      const isMovie = ("type" in item && (item.type === "movie" || item.type === "MOVIE"));
      const isTVShow = ("type" in item && (item.type === "tv" || item.type === "tv_show" || item.type === "TV_SHOW"));
      const isGame = ("type" in item && (item.type === "game" || item.type === "GAME"));

      if (isMovie || isTVShow || isGame) {
        // Return only the first author
        const firstAuthor = item.authors[0];
        if (typeof firstAuthor === "string") {
          return firstAuthor;
        } else if (firstAuthor && "name" in firstAuthor) {
          return firstAuthor.name;
        }
      }

      // For other content types (albums, books), show all authors
      return formatAuthors(item.authors);
    }
    return "";
  };


  const getReleaseDate = (): string => {
    if ("release_date" in item && item.release_date) {
      return formatReleaseDate(item.release_date);
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
      onAuxClick={handleAuxClick}
      onMouseDown={handleMouseDown}
      className={`cursor-pointer ${className || ""}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          const url = getNavigationUrl();
          if (url) {
            router.push(url);
          }
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
