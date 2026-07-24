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
import { ContentType } from "@/lib/types";
import {
  getContentTypeDisplayName,
  normalizeContentType,
} from "@/lib/utils/contentTypeUtils";

export const CONTENT_TYPE_ICONS: Record<ContentType, LucideIcon> = {
  [ContentType.MOVIE]: Film,
  [ContentType.TV_SHOW]: Tv,
  [ContentType.SEASON]: Tv,
  [ContentType.GAME]: Gamepad2,
  [ContentType.BOOK]: Book,
  [ContentType.ALBUM]: Music,
  [ContentType.PERSON]: UserRound,
};

export function getContentTypeIcon(contentType: ContentType | string): LucideIcon {
  const normalizedType = normalizeContentType(contentType);
  return normalizedType ? CONTENT_TYPE_ICONS[normalizedType] : CircleHelp;
}

export function getContentTypeLabel(contentType: ContentType | string): string {
  return getContentTypeDisplayName(contentType);
}
