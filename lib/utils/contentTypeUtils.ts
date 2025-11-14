/**
 * Content Type Utilities
 *
 * Centralized mapping between ContentType and SourceApi to eliminate
 * duplicated mapping logic across the codebase.
 *
 * This utility eliminates 27+ instances of duplicated if/else logic.
 */

import { ContentType, SourceApi } from '@/lib/api/types';

/**
 * Configuration mapping for content types to their source APIs
 */
export const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  {
    sourceApi: SourceApi;
    displayName: string;
  }
> = {
  [ContentType.MOVIE]: {
    sourceApi: SourceApi.TMDB,
    displayName: 'Movie',
  },
  [ContentType.TV_SHOW]: {
    sourceApi: SourceApi.TMDB,
    displayName: 'TV Show',
  },
  [ContentType.SEASON]: {
    sourceApi: SourceApi.TMDB,
    displayName: 'Season',
  },
  [ContentType.GAME]: {
    sourceApi: SourceApi.IGDB,
    displayName: 'Game',
  },
  [ContentType.ALBUM]: {
    sourceApi: SourceApi.SPOTIFY,
    displayName: 'Album',
  },
  [ContentType.BOOK]: {
    sourceApi: SourceApi.OPENLIBRARY,
    displayName: 'Book',
  },
  [ContentType.PERSON]: {
    sourceApi: SourceApi.TMDB,
    displayName: 'Person',
  },
};

/**
 * Get the source API for a given content type
 *
 * @param contentType - The content type to get the source API for
 * @returns The corresponding SourceApi, defaults to TMDB if not found
 *
 * @example
 * ```ts
 * const sourceApi = getSourceApi(ContentType.GAME); // SourceApi.IGDB
 * const sourceApi = getSourceApi(ContentType.MOVIE); // SourceApi.TMDB
 * ```
 */
export function getSourceApi(contentType: ContentType): SourceApi {
  return CONTENT_TYPE_CONFIG[contentType]?.sourceApi ?? SourceApi.TMDB;
}

/**
 * Get the display name for a given content type
 *
 * @param contentType - The content type to get the display name for
 * @returns The human-readable display name
 *
 * @example
 * ```ts
 * const name = getContentTypeDisplayName(ContentType.TV_SHOW); // 'TV Show'
 * const name = getContentTypeDisplayName(ContentType.ALBUM); // 'Album'
 * ```
 */
export function getContentTypeDisplayName(contentType: ContentType): string {
  return CONTENT_TYPE_CONFIG[contentType]?.displayName ?? 'Unknown';
}

/**
 * Check if a content type is video-based (movie or TV)
 *
 * @param contentType - The content type to check
 * @returns True if the content type is video-based
 *
 * @example
 * ```ts
 * isVideoContent(ContentType.MOVIE); // true
 * isVideoContent(ContentType.GAME); // false
 * ```
 */
export function isVideoContent(contentType: ContentType): boolean {
  return (
    contentType === ContentType.MOVIE ||
    contentType === ContentType.TV_SHOW ||
    contentType === ContentType.SEASON
  );
}

/**
 * Get all content types for a given source API
 *
 * @param sourceApi - The source API to filter by
 * @returns Array of ContentTypes that use this source API
 *
 * @example
 * ```ts
 * const tmdbTypes = getContentTypesBySourceApi(SourceApi.TMDB);
 * // [ContentType.MOVIE, ContentType.TV_SHOW, ContentType.SEASON, ContentType.PERSON]
 * ```
 */
export function getContentTypesBySourceApi(sourceApi: SourceApi): ContentType[] {
  return Object.entries(CONTENT_TYPE_CONFIG)
    .filter(([_, config]) => config.sourceApi === sourceApi)
    .map(([type]) => type as ContentType);
}
