import { ContentType, SourceApi } from "@/lib/types";

const SOURCE_API_MAP: Record<string, SourceApi> = {
  game:    SourceApi.IGDB,
  album:   SourceApi.SPOTIFY,
  book:    SourceApi.OPENLIBRARY,
  movie:   SourceApi.TMDB,
  tv_show: SourceApi.TMDB,
  season:  SourceApi.TMDB,
  person:  SourceApi.TMDB,
};

const DISPLAY_NAME_MAP: Record<string, string> = {
  game:    "Game",
  album:   "Album",
  book:    "Book",
  movie:   "Movie",
  tv_show: "TV Show",
  season:  "Season",
  person:  "Person",
};

const VALID_CONTENT_TYPES = new Set(Object.keys(SOURCE_API_MAP));

export function isValidContentType(type: string): type is ContentType {
  return VALID_CONTENT_TYPES.has(type.toLowerCase());
}

export function getSourceApi(type: string | ContentType): SourceApi {
  return SOURCE_API_MAP[type.toLowerCase()] ?? SourceApi.TMDB;
}

export function getContentTypeDisplayName(type: string | ContentType): string {
  return DISPLAY_NAME_MAP[type.toLowerCase()] ?? type;
}
