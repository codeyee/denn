"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Card from "../Card";
import {
  SourceApi,
  ContentType,
  Author,
} from "@/lib/api/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { getCardImageUrl } from "@/lib/utils/imageUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";
import { Content } from "@/types";
import { Plus } from "lucide-react";
import { Button } from "@/app/_components/lib/button";
import AddToListModal from "@/app/_components/common/Modal/AddToListModal";

interface ContentCardProps {
  item: Content;
  className?: string;
}

export default function ContentCard({ item, className }: ContentCardProps) {
  const router = useRouter();
  const middleClickHandled = useRef(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);

  const getNavigationUrl = (): string | null => {
    let sourceApi: SourceApi | undefined;
    let contentType: ContentType | undefined;
    let externalId: string | undefined;

    if (item.type === "MOVIE") {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.MOVIE;
      externalId = String(item.id);
    } else if (item.type === "TV_SHOW") {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.TV_SHOW;
      externalId = String(item.id);
    } else if (item.type === "ALBUM") {
      sourceApi = SourceApi.SPOTIFY;
      contentType = ContentType.ALBUM;
      externalId = String(item.id);
    } else if (item.type === "GAME") {
      sourceApi = SourceApi.IGDB;
      contentType = ContentType.GAME;
      externalId = String(item.id);
    } else if (item.type === "BOOK") {
      sourceApi = SourceApi.OPENLIBRARY;
      contentType = ContentType.BOOK;
      externalId = String(item.id);
    } else if (item.type === "SEASON") {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.SEASON;
      externalId = String(item.id);
    }

    if (sourceApi && contentType && externalId) {
      const params = new URLSearchParams({
        external_id: externalId,
        source_api: sourceApi,
        content_type: contentType,
      });
      return `/content?${params.toString()}`;
    } else {
      console.error("Missing required parameters:", {
        sourceApi,
        contentType,
        externalId,
      });
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
      const newWindow = window.open(url, "_blank");
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
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");

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

  const getPosterImageUrl = (item: Content): string | undefined => {
    return getCardImageUrl(item?.images, item?.image_url) || undefined;
  };

  const getFooterInfo = (): string => {
    const footerInfo: string[] = [];

    if (item.type === "BOOK" && item.pages) {
      footerInfo.push(`${item.pages} pages`);
    }

    if (item.type === "ALBUM" && item.total_tracks) {
      footerInfo.push(
        `${item.total_tracks} ${
          item.total_tracks === 1 ? "track" : "tracks"
        }`
      );
    }

    if (
      (item.type === "MOVIE" || item.type === "ALBUM") &&
      item.duration_minutes
    ) {
      const mins = item.duration_minutes as number;
      footerInfo.push(`${mins} min`);
    }

    if (item.type === "SEASON") {
      const episodes = item.number_of_episodes;
      if (typeof episodes === "number" && episodes > 0) {
        footerInfo.push(
          `${episodes} ${episodes === 1 ? "episode" : "episodes"}`
        );
      }
    } else if (item.type === "TV_SHOW") {
      const seasons = item.number_of_seasons;
      const episodes = item.number_of_episodes;
      if (seasons || episodes) {
        const parts: string[] = [];
        if (typeof seasons === "number" && seasons > 0) {
          parts.push(`${seasons} ${seasons === 1 ? "season" : "seasons"}`);
        }
        if (typeof episodes === "number" && episodes > 0) {
          parts.push(
            `${episodes} ${episodes === 1 ? "episode" : "episodes"}`
          );
        }
        if (parts.length) footerInfo.push(parts.join(" • "));
      }
    }

    return footerInfo.join(" • ");
  };

  const getAuthorsText = (): string => {
    if ("authors" in item && item.authors && item.authors.length > 0) {
      if (
        item.type === "MOVIE" ||
        item.type === "TV_SHOW" ||
        item.type === "GAME"
      ) {
        const firstAuthor = item.authors[0];
        if (typeof firstAuthor === "string") {
          return firstAuthor;
        } else if (firstAuthor && "name" in firstAuthor) {
          return firstAuthor.name;
        }
      }
      return formatAuthors(item.authors as Author[]);
    }
    return "";
  };

  const getReleaseDate = (): string => {
    if (item.release_date) {
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

  // For seasons, display as "TV Show Title - Season Title"
  const isSeason = item.type === "SEASON";
  const title = isSeason && "tv_show_name" in item && item.tv_show_name
    ? `${item.tv_show_name} - ${item.title}`
    : item.title;

  const imageUrl = getPosterImageUrl(item);
  const id = String(item.id);
  const type = item.type;

  const footerInfo = getFooterInfo();
  const authors = getAuthorsText();
  const originalTitle = getOriginalTitle();
  const releaseDate = getReleaseDate();

  const originalTitleIsSameAsTitle =
    originalTitle.toLowerCase() === title.toLowerCase();

  // Get description from item
  const getDescription = (): string => {
    if ("description" in item && item.description) {
      return item.description;
    }
    return "";
  };

  const description = getDescription();

  // Helper to get content item info for AddToListModal
  const getContentItemForModal = () => {
    let sourceApi: SourceApi = SourceApi.TMDB;
    let contentType: ContentType = ContentType.MOVIE;
    const externalId: string = String(item.id);

    // Determine source API and content type from the item
    if ("type" in item && typeof item.type === "string") {
      const itemType = item.type.toLowerCase();
      if (itemType === "movie") {
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.MOVIE;
      } else if (itemType === "tv" || itemType === "tv_show") {
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.TV_SHOW;
      } else if (itemType === "album" || itemType === "music" || itemType === "ep") {
        sourceApi = SourceApi.SPOTIFY;
        contentType = ContentType.ALBUM;
      } else if (itemType === "game") {
        sourceApi = SourceApi.IGDB;
        contentType = ContentType.GAME;
      } else if (itemType === "book") {
        sourceApi = SourceApi.OPENLIBRARY;
        contentType = ContentType.BOOK;
      } else if (itemType === "season") {
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.SEASON;
      }
    } else if ("platforms" in item) {
      sourceApi = SourceApi.IGDB;
      contentType = ContentType.GAME;
    } else if ("total_tracks" in item) {
      sourceApi = SourceApi.SPOTIFY;
      contentType = ContentType.ALBUM;
    } else if ("pages" in item) {
      sourceApi = SourceApi.OPENLIBRARY;
      contentType = ContentType.BOOK;
    } else if ("number_of_seasons" in item || "number_of_episodes" in item) {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.TV_SHOW;
    }

    return {
      source_api: sourceApi,
      external_id: externalId,
      content_type: contentType,
    };
  };

  const handleAddToList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddToListModalOpen(true);
  };

  return (
    <>
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
          type={type as ContentType}
          id={id}
          title={title}
          backgroundImage={imageUrl || ""}
          backgroundImageAlt={`${title} cover image`}
          isEmpty={!imageUrl}
          hoverContent={
            <Card.HoverContent>
              <div className="space-y-3">
                {/* Description */}
                {description && (
                  <p className="text-xs md:text-sm text-white/90 line-clamp-3">
                    {description}
                  </p>
                )}

                {/* Action Button */}
                <Button
                  onClick={handleAddToList}
                  variant="secondary"
                  size="sm"
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to List
                </Button>
              </div>
            </Card.HoverContent>
          }
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

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={isAddToListModalOpen}
        onOpenChange={setIsAddToListModalOpen}
        contentItem={getContentItemForModal()}
      />
    </>
  );
}
