import { Content } from "@/lib/types";
import { Author } from "@/lib/types";
import { getCardImageUrl } from "@/lib/utils/imageUtils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatAuthors } from "@/lib/utils/authorUtils";

export function getPosterImageUrl(item: Content): string | undefined {
  return getCardImageUrl(item?.images, item?.image_url) || undefined;
}

export function getFooterInfo(item: Content): string {
  const footerInfo: string[] = [];

  if (item.type === "BOOK" && item.pages) {
    footerInfo.push(`${item.pages} pages`);
  }

  if (item.type === "ALBUM" && item.total_tracks) {
    footerInfo.push(
      `${item.total_tracks} ${item.total_tracks === 1 ? "track" : "tracks"}`
    );
  }

  if (
    (item.type === "MOVIE" || item.type === "ALBUM") &&
    item.duration_minutes
  ) {
    const mins = item.duration_minutes as number;
    footerInfo.push(`${mins} min`);
  }

  if (item.type === "SEASON") {
    const episodes = item.number_of_episodes;
    if (typeof episodes === "number" && episodes > 0) {
      footerInfo.push(
        `${episodes} ${episodes === 1 ? "episode" : "episodes"}`
      );
    }
  } else if (item.type === "TV_SHOW") {
    const seasons = item.number_of_seasons;
    const episodes = item.number_of_episodes;
    if (seasons || episodes) {
      const parts: string[] = [];
      if (typeof seasons === "number" && seasons > 0) {
        parts.push(`${seasons} ${seasons === 1 ? "season" : "seasons"}`);
      }
      if (typeof episodes === "number" && episodes > 0) {
        parts.push(
          `${episodes} ${episodes === 1 ? "episode" : "episodes"}`
        );
      }
      if (parts.length) footerInfo.push(parts.join(" • "));
    }
  }

  return footerInfo.join(" • ");
}

export function getAuthorsText(item: Content): string {
  if ("authors" in item && item.authors && item.authors.length > 0) {
    if (
      item.type === "MOVIE" ||
      item.type === "TV_SHOW" ||
      item.type === "GAME"
    ) {
      const firstAuthor = item.authors[0];
      if (typeof firstAuthor === "string") {
        return firstAuthor;
      } else if (firstAuthor && "name" in firstAuthor) {
        return firstAuthor.name;
      }
    }
    return formatAuthors(item.authors as Author[]);
  }
  return "";
}

export function getReleaseDate(item: Content): string {
  if (item.release_date) {
    return formatReleaseDate(item.release_date);
  }
  return "";
}

export function getOriginalTitle(item: Content): string {
  if ("original_title" in item && item.original_title) {
    return item.original_title;
  }
  return "";
}

export function getDescription(item: Content): string {
  if ("description" in item && item.description) {
    return item.description;
  }
  return "";
}
