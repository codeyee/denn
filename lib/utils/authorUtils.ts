import { Author, Platform } from "@/lib/api/types";

function isEmptyArray(arr: unknown): arr is null | undefined {
  return !arr || !Array.isArray(arr) || arr.length === 0;
}

function isAuthorArray(authors: Author[] | string[]): authors is Author[] {
  if (authors.length === 0) return false;
  const firstItem = authors[0];

  return (
    typeof firstItem === "object" &&
    firstItem !== null &&
    "name" in firstItem
  );
}

function isPlatformArray(platforms: Platform[] | string[]): platforms is Platform[] {
  if (platforms.length === 0) return false;
  const firstItem = platforms[0];

  return (
    typeof firstItem === "object" &&
    firstItem !== null &&
    "title" in firstItem
  );
}

export function formatAuthors(authors: Author[] | string[] | null | undefined): string {
  if (isEmptyArray(authors)) return "";

  if (isAuthorArray(authors)) {
    return authors.map((author) => author.name).join(", ");
  }

  return authors.join(", ");
}

export function getAuthorNames(authors: Author[] | string[] | null | undefined): string[] {
  if (isEmptyArray(authors)) return [];

  if (isAuthorArray(authors)) {
    return authors.map((author) => author.name);
  }

  return authors;
}

export function formatPlatforms(platforms: Platform[] | string[] | null | undefined): string {
  if (isEmptyArray(platforms)) return "";

  if (isPlatformArray(platforms)) {
      return platforms.map((platform) => platform.title).join(", ");
  }

  return platforms.join(", ");
}
