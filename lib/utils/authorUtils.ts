import { Author, Platform } from "@/lib/api/types";

export function formatAuthors(
    authors: Author[] | string[] | null | undefined
): string {
    if (!authors || !Array.isArray(authors) || authors.length === 0) {
        return "";
    }

    if (
        typeof authors[0] === "object" &&
        authors[0] !== null &&
        "name" in authors[0]
    ) {
        return (authors as Author[]).map((author) => author.name).join(", ");
    }

    return (authors as string[]).join(", ");
}

export function getAuthorNames(
    authors: Author[] | string[] | null | undefined
): string[] {
    if (!authors || !Array.isArray(authors) || authors.length === 0) {
        return [];
    }

    if (
        typeof authors[0] === "object" &&
        authors[0] !== null &&
        "name" in authors[0]
    ) {
        return (authors as Author[]).map((author) => author.name);
    }

    return authors as string[];
}

export function formatPlatforms(
    platforms: Platform[] | string[] | null | undefined
): string {
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return "";
    }

    if (
        typeof platforms[0] === "object" &&
        platforms[0] !== null &&
        "title" in platforms[0]
    ) {
        return (platforms as Platform[])
            .map((platform) => platform.title)
            .join(", ");
    }

    return (platforms as string[]).join(", ");
}
