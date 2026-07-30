import {
  Book,
  CircleHelp,
  Film,
  Gamepad2,
  Music,
  Tv,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { ContentType, SourceApi } from "@/lib/types";

export interface ContentTypeDefinition {
  type: ContentType;
  label: string;
  pluralLabel: string;
  sectionTitle?: string;
  icon: LucideIcon;
  slug: string;
  sourceApi: SourceApi;
  order: number;
}

export const CONTENT_TYPE_DEFINITIONS: Record<
  ContentType,
  ContentTypeDefinition
> = {
  [ContentType.MOVIE]: {
    type: ContentType.MOVIE,
    label: "Movie",
    pluralLabel: "Movies",
    sectionTitle: "Popular Movies",
    icon: Film,
    slug: "movies",
    sourceApi: SourceApi.TMDB,
    order: 0,
  },
  [ContentType.TV_SHOW]: {
    type: ContentType.TV_SHOW,
    label: "TV Show",
    pluralLabel: "TV Shows",
    sectionTitle: "Popular TV Shows",
    icon: Tv,
    slug: "tv-shows",
    sourceApi: SourceApi.TMDB,
    order: 1,
  },
  [ContentType.SEASON]: {
    type: ContentType.SEASON,
    label: "Season",
    pluralLabel: "Seasons",
    icon: Tv,
    slug: "seasons",
    sourceApi: SourceApi.TMDB,
    order: 2,
  },
  [ContentType.GAME]: {
    type: ContentType.GAME,
    label: "Game",
    pluralLabel: "Games",
    sectionTitle: "Popular Games",
    icon: Gamepad2,
    slug: "games",
    sourceApi: SourceApi.IGDB,
    order: 3,
  },
  [ContentType.ALBUM]: {
    type: ContentType.ALBUM,
    label: "Album",
    pluralLabel: "Music",
    sectionTitle: "Popular Music Albums",
    icon: Music,
    slug: "music",
    sourceApi: SourceApi.SPOTIFY,
    order: 4,
  },
  [ContentType.BOOK]: {
    type: ContentType.BOOK,
    label: "Book",
    pluralLabel: "Books",
    sectionTitle: "Popular Books",
    icon: Book,
    slug: "books",
    sourceApi: SourceApi.OPENLIBRARY,
    order: 5,
  },
  [ContentType.PERSON]: {
    type: ContentType.PERSON,
    label: "Person",
    pluralLabel: "People",
    icon: UserRound,
    slug: "people",
    sourceApi: SourceApi.TMDB,
    order: 6,
  },
};

export const DISCOVERY_CONTENT_TYPES = [
  ContentType.MOVIE,
  ContentType.TV_SHOW,
  ContentType.GAME,
  ContentType.ALBUM,
  ContentType.BOOK,
] as const;

export type DiscoveryContentType = (typeof DISCOVERY_CONTENT_TYPES)[number];

export const FILTERABLE_CONTENT_TYPES = [
  ContentType.MOVIE,
  ContentType.TV_SHOW,
  ContentType.SEASON,
  ContentType.GAME,
  ContentType.ALBUM,
  ContentType.BOOK,
] as const;

export const CONTENT_TYPE_ICONS: Record<ContentType, LucideIcon> =
  Object.fromEntries(
    Object.values(CONTENT_TYPE_DEFINITIONS).map(({ type, icon }) => [
      type,
      icon,
    ]),
  ) as Record<ContentType, LucideIcon>;

const CONTENT_TYPE_ALIASES: Record<string, ContentType> = {
  album: ContentType.ALBUM,
  albums: ContentType.ALBUM,
  book: ContentType.BOOK,
  books: ContentType.BOOK,
  game: ContentType.GAME,
  games: ContentType.GAME,
  movie: ContentType.MOVIE,
  movies: ContentType.MOVIE,
  music: ContentType.ALBUM,
  person: ContentType.PERSON,
  people: ContentType.PERSON,
  season: ContentType.SEASON,
  seasons: ContentType.SEASON,
  tv: ContentType.TV_SHOW,
  "tv-show": ContentType.TV_SHOW,
  "tv-shows": ContentType.TV_SHOW,
  tv_show: ContentType.TV_SHOW,
};

export function normalizeContentType(
  type: string | ContentType,
): ContentType | null {
  return CONTENT_TYPE_ALIASES[type.toLowerCase()] ?? null;
}

export function getContentTypeDefinition(
  type: string | ContentType,
): ContentTypeDefinition | null {
  const normalizedType = normalizeContentType(type);
  return normalizedType ? CONTENT_TYPE_DEFINITIONS[normalizedType] : null;
}

export function getContentTypeIcon(
  type: string | ContentType,
): LucideIcon {
  return getContentTypeDefinition(type)?.icon ?? CircleHelp;
}

export function getContentTypeLabel(type: string | ContentType): string {
  return getContentTypeDefinition(type)?.label ?? String(type);
}

export function getContentTypePluralLabel(
  type: string | ContentType,
): string {
  return getContentTypeDefinition(type)?.pluralLabel ?? String(type);
}

export function getSourceApi(type: string | ContentType): SourceApi {
  return getContentTypeDefinition(type)?.sourceApi ?? SourceApi.TMDB;
}

export function isValidContentType(type: string): boolean {
  return normalizeContentType(type) !== null;
}
