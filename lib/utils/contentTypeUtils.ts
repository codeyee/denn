import { ContentType, SourceApi } from "@/lib/types";

interface ContentTypeConfig {
  sourceApi: SourceApi;
  displayName: string;
}

export const CONTENT_TYPE_CONFIG: Record<ContentType, ContentTypeConfig> = {
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

export function isValidContentType(type: string): type is ContentType {
  return type in CONTENT_TYPE_CONFIG;
}

export function getSourceApi(type: string | ContentType): SourceApi {
  if (isValidContentType(type)) {
    return CONTENT_TYPE_CONFIG[type]?.sourceApi ?? SourceApi.TMDB;
  }
  return SourceApi.TMDB;
}

export function getContentTypeDisplayName(type: string | ContentType): string {
  if (isValidContentType(type)) {
    return CONTENT_TYPE_CONFIG[type]?.displayName ?? type;
  }
  return type;
}
