export function formatReleaseDate(
    dateString: string | null | undefined
): string {
    if (!dateString) {
        return "";
    }

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return dateString;
    }
}
