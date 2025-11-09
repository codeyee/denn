import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { contentTypeEnum } from "@/types/types";
import { SourceApi, ContentType } from "@/lib/api/types";

export const CONTENT_TYPE_ICONS: Record<string, LucideIcon> = {
  movie: Film,
  tv: Tv,
  tv_show: Tv,
  season: Tv,
  game: Gamepad2,
  book: Book,
  music: Music,
  album: Music,
};

export function getContentTypeIcon(contentType: string): LucideIcon {
  const normalizedType = contentType.toLowerCase();
  return CONTENT_TYPE_ICONS[normalizedType] || Film;
}

/**
 * Infers the contentTypeEnum from an item for display purposes (icons, labels).
 * This is the centralized type detection logic used across all components.
 *
 * Priority:
 * 1. Check explicit 'type' field (case-insensitive)
 * 2. Check 'content_type' field
 * 3. Check content-specific properties
 * 4. Default to movie
 */
export function inferContentTypeEnum(item: Record<string, unknown>): contentTypeEnum {
  // Check explicit type field first
  if ("type" in item && typeof item.type === "string") {
    const itemType = item.type.toLowerCase();
    if (itemType === "movie") return contentTypeEnum.movie;
    if (itemType === "tv" || itemType === "tv_show") return contentTypeEnum.tv;
    if (itemType === "album" || itemType === "music") return contentTypeEnum.music;
    if (itemType === "season") return contentTypeEnum.tv;
    if (itemType === "game") return contentTypeEnum.game;
    if (itemType === "book") return contentTypeEnum.book;
  }

  // Check by content_type field
  if ("content_type" in item && typeof item.content_type === "string") {
    const type = item.content_type.toLowerCase();
    if (type === "movie") return contentTypeEnum.movie;
    if (type === "tv_show" || type === "season") return contentTypeEnum.tv;
    if (type === "album") return contentTypeEnum.music;
    if (type === "game") return contentTypeEnum.game;
    if (type === "book") return contentTypeEnum.book;
  }

  // Fall back to property-based detection
  if ("number_of_seasons" in item || "number_of_episodes" in item) {
    return contentTypeEnum.tv;
  }

  if ("pages" in item) return contentTypeEnum.book;
  if ("total_tracks" in item) return contentTypeEnum.music;

  // Movies have duration_minutes (but so can albums, so check total_tracks first)
  if ("duration_minutes" in item) return contentTypeEnum.movie;

  return contentTypeEnum.movie;
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use inferContentTypeEnum instead
 */
export const getContentTypeEnum = inferContentTypeEnum;

export function getContentTypeLabel(contentType: string): string {
  const normalizedType = contentType.toLowerCase();
  const labels: Record<string, string> = {
    movie: "Movie",
    tv: "TV Show",
    tv_show: "TV Show",
    season: "Season",
    game: "Game",
    book: "Book",
    music: "Music",
    album: "Album",
  };
  return labels[normalizedType] || contentType;
}

export interface NavigationParams {
  sourceApi: SourceApi | undefined;
  contentType: ContentType | undefined;
  externalId: string | undefined;
}

/**
 * Infers navigation parameters (sourceApi, contentType, externalId) from an item.
 * This is used for navigating to content detail pages.
 *
 * Priority:
 * 1. Check explicit 'type' field and map to appropriate source API
 * 2. Fall back to property-based detection
 * 3. Handle special cases (seasons with explicit external_id)
 *
 * @param item - The content item to infer navigation params from
 * @returns Object with sourceApi, contentType, and externalId
 */
export function inferNavigationParams(item: Record<string, unknown>): NavigationParams {
  let sourceApi: SourceApi | undefined;
  let contentType: ContentType | undefined;
  let externalId: string | undefined;

  // First check if there's an explicit type field
  if ("type" in item && typeof item.type === "string") {
    const itemType = item.type.toLowerCase();
    const itemId = "id" in item ? String(item.id) : undefined;

    if (itemType === "movie") {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.MOVIE;
      externalId = itemId;
    } else if (itemType === "tv" || itemType === "tv_show") {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.TV_SHOW;
      externalId = itemId;
    } else if (itemType === "album" || itemType === "music" || itemType === "ep") {
      sourceApi = SourceApi.SPOTIFY;
      contentType = ContentType.ALBUM;
      externalId = itemId;
    } else if (itemType === "game") {
      sourceApi = SourceApi.IGDB;
      contentType = ContentType.GAME;
      externalId = itemId;
    } else if (itemType === "book") {
      sourceApi = SourceApi.OPENLIBRARY;
      contentType = ContentType.BOOK;
      externalId = itemId;
    } else if (itemType === "season") {
      // For seasons, use explicit external_id, source_api, and content_type if available
      if ("external_id" in item && item.external_id) {
        sourceApi = ("source_api" in item ? item.source_api as SourceApi : undefined) || SourceApi.TMDB;
        contentType = ("content_type" in item ? item.content_type as ContentType : undefined) || ContentType.SEASON;
        externalId = String(item.external_id);
      } else {
        sourceApi = SourceApi.TMDB;
        contentType = ContentType.SEASON;
        externalId = itemId;
      }
    }
  }

  // If not determined by type field, check properties
  if (!sourceApi || !contentType) {
    const itemId = "id" in item ? String(item.id) : undefined;

    if ("total_tracks" in item) {
      sourceApi = SourceApi.SPOTIFY;
      contentType = ContentType.ALBUM;
      externalId = itemId;
    } else if ("pages" in item) {
      sourceApi = SourceApi.OPENLIBRARY;
      contentType = ContentType.BOOK;
      externalId = itemId;
    } else if ("number_of_seasons" in item || "number_of_episodes" in item) {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.TV_SHOW;
      externalId = itemId;
    } else if ("duration_minutes" in item) {
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.MOVIE;
      externalId = itemId;
    } else {
      // Default to movie
      sourceApi = SourceApi.TMDB;
      contentType = ContentType.MOVIE;
      externalId = itemId;
    }
  }

  return { sourceApi, contentType, externalId };
}
