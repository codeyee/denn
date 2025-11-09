import { Author, Platform } from "@/lib/api/types";

/**
 * Helper to format authors from the new Author[] structure or legacy string[] structure
 * @param authors - Array of authors (can be new Author[] structure or old string[] structure)
 * @returns Comma-separated string of author names
 */
export function formatAuthors(authors: Author[] | string[] | null | undefined): string {
  if (!authors || !Array.isArray(authors) || authors.length === 0) {
    return "";
  }

  // Check if it's the new Author[] structure (objects with name and type)
  if (typeof authors[0] === "object" && authors[0] !== null && "name" in authors[0]) {
    return (authors as Author[]).map((author) => author.name).join(", ");
  }

  // Legacy string[] structure
  return (authors as string[]).join(", ");
}

/**
 * Get authors as an array of names
 * @param authors - Array of authors (can be new Author[] structure or old string[] structure)
 * @returns Array of author names
 */
export function getAuthorNames(authors: Author[] | string[] | null | undefined): string[] {
  if (!authors || !Array.isArray(authors) || authors.length === 0) {
    return [];
  }

  // Check if it's the new Author[] structure
  if (typeof authors[0] === "object" && authors[0] !== null && "name" in authors[0]) {
    return (authors as Author[]).map((author) => author.name);
  }

  // Legacy string[] structure
  return authors as string[];
}

/**
 * Helper to format platforms from the new Platform[] structure or legacy string[] structure
 * @param platforms - Array of platforms (can be new Platform[] structure or old string[] structure)
 * @returns Comma-separated string of platform names
 */
export function formatPlatforms(platforms: Platform[] | string[] | null | undefined): string {
  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return "";
  }

  // Check if it's the new Platform[] structure (objects with title)
  if (typeof platforms[0] === "object" && platforms[0] !== null && "title" in platforms[0]) {
    return (platforms as Platform[]).map((platform) => platform.title).join(", ");
  }

  // Legacy string[] structure
  return (platforms as string[]).join(", ");
}
