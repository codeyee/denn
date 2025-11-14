import { ContentType, SourceApi } from "@/lib/api/types";

/**
 * Content type configuration mapping
 * Maps content types to their source APIs and provides centralized configuration
 */
export const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  {
    sourceApi: SourceApi;
    contentType: ContentType;
    label: string;
    pluralLabel: string;
  }
> = {
  [ContentType.MOVIE]: {
    sourceApi: SourceApi.TMDB,
    contentType: ContentType.MOVIE,
    label: "Movie",
    pluralLabel: "Movies",
  },
  [ContentType.TV_SHOW]: {
    sourceApi: SourceApi.TMDB,
    contentType: ContentType.TV_SHOW,
    label: "TV Show",
    pluralLabel: "TV Shows",
  },
  [ContentType.SEASON]: {
    sourceApi: SourceApi.TMDB,
    contentType: ContentType.SEASON,
    label: "Season",
    pluralLabel: "Seasons",
  },
  [ContentType.GAME]: {
    sourceApi: SourceApi.IGDB,
    contentType: ContentType.GAME,
    label: "Game",
    pluralLabel: "Games",
  },
  [ContentType.ALBUM]: {
    sourceApi: SourceApi.SPOTIFY,
    contentType: ContentType.ALBUM,
    label: "Album",
    pluralLabel: "Albums",
  },
  [ContentType.BOOK]: {
    sourceApi: SourceApi.OPENLIBRARY,
    contentType: ContentType.BOOK,
    label: "Book",
    pluralLabel: "Books",
  },
  [ContentType.PERSON]: {
    sourceApi: SourceApi.TMDB,
    contentType: ContentType.PERSON,
    label: "Person",
    pluralLabel: "People",
  },
};

/**
 * Get the source API for a given content type
 * @param type - Content type string
 * @returns Source API enum value
 */
export function getSourceApi(type: string | ContentType): SourceApi {
  const contentType = type as ContentType;
  return CONTENT_TYPE_CONFIG[contentType]?.sourceApi ?? SourceApi.TMDB;
}

/**
 * Get the ContentType enum from a string
 * @param type - Content type string
 * @returns ContentType enum value
 */
export function getContentType(type: string): ContentType {
  const contentType = type as ContentType;
  return CONTENT_TYPE_CONFIG[contentType]?.contentType ?? ContentType.MOVIE;
}

/**
 * Get the human-readable label for a content type
 * @param type - Content type
 * @param plural - Whether to return plural form
 * @returns Human-readable label
 */
export function getContentTypeLabel(
  type: ContentType,
  plural: boolean = false
): string {
  const config = CONTENT_TYPE_CONFIG[type];
  if (!config) return type;
  return plural ? config.pluralLabel : config.label;
}

/**
 * Check if a content type is valid
 * @param type - Content type string
 * @returns True if valid content type
 */
export function isValidContentType(type: string): type is ContentType {
  return type in CONTENT_TYPE_CONFIG;
}

/**
 * Get all available content types
 * @returns Array of all ContentType values
 */
export function getAllContentTypes(): ContentType[] {
  return Object.keys(CONTENT_TYPE_CONFIG) as ContentType[];
}
