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

const CONTENT_TYPE_MAP: Record<string, ContentType> = {
  movie: ContentType.MOVIE,
  tv_show: ContentType.TV_SHOW,
  season: ContentType.SEASON,
  game: ContentType.GAME,
  album: ContentType.ALBUM,
  book: ContentType.BOOK,
  person: ContentType.PERSON,
};

export function isValidContentType(type: string): type is ContentType {
  return normalizeContentType(type) !== null;
}

export function normalizeContentType(
  type: string | ContentType,
): ContentType | null {
  return CONTENT_TYPE_MAP[type.toLowerCase()] ?? null;
}

export function getSourceApi(type: string | ContentType): SourceApi {
  return SOURCE_API_MAP[type.toLowerCase()] ?? SourceApi.TMDB;
}

export function getContentTypeDisplayName(type: string | ContentType): string {
  return DISPLAY_NAME_MAP[type.toLowerCase()] ?? type;
}
