import { ContentType, SourceApi } from "@/lib/api/types";

/**
 * Configuration mapping content types to their source APIs
 * This eliminates duplication of source API mapping logic across components
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
    displayName: "Movie",
  },
  [ContentType.TV_SHOW]: {
    sourceApi: SourceApi.TMDB,
    displayName: "TV Show",
  },
  [ContentType.SEASON]: {
    sourceApi: SourceApi.TMDB,
    displayName: "Season",
  },
  [ContentType.GAME]: {
    sourceApi: SourceApi.IGDB,
    displayName: "Game",
  },
  [ContentType.ALBUM]: {
    sourceApi: SourceApi.SPOTIFY,
    displayName: "Album",
  },
  [ContentType.BOOK]: {
    sourceApi: SourceApi.OPENLIBRARY,
    displayName: "Book",
  },
  [ContentType.PERSON]: {
    sourceApi: SourceApi.TMDB,
    displayName: "Person",
  },
};

/**
 * Get the source API for a given content type
 * @param type - Content type (can be string or ContentType enum)
 * @returns SourceApi enum value, defaults to TMDB if type is unknown
 */
export function getSourceApi(type: string | ContentType): SourceApi {
  const contentType = type as ContentType;
  return CONTENT_TYPE_CONFIG[contentType]?.sourceApi ?? SourceApi.TMDB;
}

/**
 * Get the display name for a content type
 * @param type - Content type (can be string or ContentType enum)
 * @returns Human-readable display name
 */
export function getContentTypeDisplayName(
  type: string | ContentType
): string {
  const contentType = type as ContentType;
  return CONTENT_TYPE_CONFIG[contentType]?.displayName ?? type;
}

/**
 * Check if a content type is valid
 * @param type - Content type to check
 * @returns true if the content type is valid
 */
export function isValidContentType(type: string): type is ContentType {
  return type in CONTENT_TYPE_CONFIG;
}

/**
 * Get all content types for a specific source API
 * @param sourceApi - Source API to filter by
 * @returns Array of ContentType values
 */
export function getContentTypesBySourceApi(
  sourceApi: SourceApi
): ContentType[] {
  return Object.entries(CONTENT_TYPE_CONFIG)
    .filter(([_, config]) => config.sourceApi === sourceApi)
    .map(([type, _]) => type as ContentType);
}
