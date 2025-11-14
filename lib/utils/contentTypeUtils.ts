import { ContentType, SourceApi } from "@/lib/api/types";

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

export function getSourceApi(type: string | ContentType): SourceApi {
  const contentType = type as ContentType;
  return CONTENT_TYPE_CONFIG[contentType]?.sourceApi ?? SourceApi.TMDB;
}

export function getContentTypeDisplayName(
  type: string | ContentType
): string {
  const contentType = type as ContentType;
  return CONTENT_TYPE_CONFIG[contentType]?.displayName ?? type;
}

export function isValidContentType(type: string): type is ContentType {
  return type in CONTENT_TYPE_CONFIG;
}

export function getContentTypesBySourceApi(
  sourceApi: SourceApi
): ContentType[] {
  return Object.entries(CONTENT_TYPE_CONFIG)
    .filter(([_, config]) => config.sourceApi === sourceApi)
    .map(([type, _]) => type as ContentType);
}
