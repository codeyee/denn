import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { contentTypeEnum } from "@/types/types";

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

export function getContentTypeEnum(item: Record<string, unknown>): contentTypeEnum {
  if ("type" in item && typeof item.type === "string") {
    if (item.type === "movie") return contentTypeEnum.movie;
    if (item.type === "tv" || item.type === "tv_show") return contentTypeEnum.tv;
    if (item.type === "album") return contentTypeEnum.music;
    if (item.type === "season") return contentTypeEnum.tv;
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

  if ("number_of_seasons" in item || "number_of_episodes" in item) {
    return contentTypeEnum.tv;
  }

  if ("platforms" in item) return contentTypeEnum.game;
  if ("pages" in item) return contentTypeEnum.book;
  if ("total_tracks" in item) return contentTypeEnum.music;

  return contentTypeEnum.movie;
}

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
