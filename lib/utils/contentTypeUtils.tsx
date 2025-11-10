import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { ContentType } from "@/lib/api/types";

export const CONTENT_TYPE_ICONS: Record<string, LucideIcon> = {
  [ContentType.MOVIE]: Film,
  [ContentType.TV_SHOW]: Tv,
  [ContentType.SEASON]: Tv,
  [ContentType.GAME]: Gamepad2,
  [ContentType.BOOK]: Book,
  [ContentType.ALBUM]: Music,
};

export function getContentTypeIcon(contentType: ContentType | string): LucideIcon {
  return CONTENT_TYPE_ICONS[contentType] || Film;
}

export function getContentTypeLabel(contentType: ContentType | string): string {
  const labels: Record<string, string> = {
    [ContentType.MOVIE]: "Movie",
    [ContentType.TV_SHOW]: "TV Show",
    [ContentType.SEASON]: "Season",
    [ContentType.GAME]: "Game",
    [ContentType.BOOK]: "Book",
    [ContentType.ALBUM]: "Album",
  };
  return labels[contentType] || String(contentType);
}
