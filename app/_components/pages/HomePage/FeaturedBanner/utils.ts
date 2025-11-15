import { Content } from "@/types";
import { getBannerImageUrl } from "@/lib/utils/imageUtils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

export function getBestImageUrl(item: Content): string | undefined {
  return getBannerImageUrl(item.images, item.image_url) || undefined;
}

export function getFooterInfo(item: Content): string {
  const parts: string[] = [];

  if (item.type === "BOOK" && item.pages) {
    parts.push(`${item.pages} pages`);
  }

  if (item.type === "ALBUM" && item.total_tracks) {
    parts.push(
      `${item.total_tracks} ${item.total_tracks === 1 ? "track" : "tracks"}`
    );
  }

  return parts.join(" • ");
}

export function getAuthors(item: Content): string {
  if ("authors" in item && item.authors && item.authors.length > 0) {
    const firstAuthor = item.authors[0];
    if (typeof firstAuthor === "string") {
      return firstAuthor;
    } else if (firstAuthor && "name" in firstAuthor) {
      return firstAuthor.name;
    }
  }
  return "";
}

export function getReleaseDate(item: Content): string {
  if (item.release_date) {
    return formatReleaseDate(item.release_date as string);
  }
  return "";
}

export function getOriginalTitle(item: Content): string {
  if ("original_title" in item && item.original_title) {
    return item.original_title as string;
  }
  return "";
}

export function getExtraInfo(item: Content): string {
  const extra: string[] = [];

  if (
    (item.type === "MOVIE" || item.type === "ALBUM") &&
    item.duration_minutes &&
    item.duration_minutes > 0
  ) {
    extra.push(`${item.duration_minutes} min`);
  }

  if (item.type === "TV_SHOW") {
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
      if (parts.length) extra.push(parts.join(" • "));
    }
  }

  return extra.join(" • ");
}

export function isOriginalTitleSame(item: Content): boolean {
  const originalTitle = getOriginalTitle(item);
  return Boolean(
    originalTitle &&
      originalTitle.toLowerCase() === item.title.toLowerCase()
  );
}
