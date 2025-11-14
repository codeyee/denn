export function formatSeasonTitle(
    tvShowName: string | null | undefined,
    seasonTitle: string | null | undefined
): string {
    if (!seasonTitle) return tvShowName || "Untitled";
    if (!tvShowName) return seasonTitle;

    const normalizedShowName = tvShowName.trim().toLowerCase();
    const normalizedSeasonTitle = seasonTitle.trim().toLowerCase();

    if (normalizedSeasonTitle.startsWith(normalizedShowName)) {
        const remainder = seasonTitle.substring(tvShowName.length).trim();

        if (!remainder || remainder.match(/^[:\-\s]+$/)) {
            return seasonTitle;
        }

        if (remainder.match(/^[:\-\s]/)) {
            const cleanRemainder = remainder.replace(/^[:\-\s]+/, "").trim();
            if (cleanRemainder && cleanRemainder.length > 0) {
                return `${tvShowName} ${cleanRemainder}`;
            }
        }

        if (remainder.match(/^[\(\[]/)) {
            return `${tvShowName} ${remainder}`;
        }

        return seasonTitle;
    }

    if (normalizedSeasonTitle.includes(normalizedShowName)) {
        return seasonTitle;
    }

    return `${tvShowName} - ${seasonTitle}`;
}
