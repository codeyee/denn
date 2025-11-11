export function formatSeasonTitle(
  tvShowName: string | null | undefined,
  seasonTitle: string | null | undefined
): string {
  if (!seasonTitle) return tvShowName || "Untitled";
  if (!tvShowName) return seasonTitle;

  const normalizedShowName = tvShowName.trim().toLowerCase();
  const normalizedSeasonTitle = seasonTitle.trim().toLowerCase();

  // Case 1: Season title starts with show name
  if (normalizedSeasonTitle.startsWith(normalizedShowName)) {
    const remainder = seasonTitle.substring(tvShowName.length).trim();

    // If remainder is empty or just punctuation, return the original season title
    if (!remainder || remainder.match(/^[:\-\s]+$/)) {
      return seasonTitle;
    }

    // If remainder starts with separator (: - etc), remove it and keep the rest
    if (remainder.match(/^[:\-\s]/)) {
      const cleanRemainder = remainder.replace(/^[:\-\s]+/, '').trim();
      // If after removing separator we have something meaningful, combine show name with it
      if (cleanRemainder && cleanRemainder.length > 0) {
        return `${tvShowName} ${cleanRemainder}`;
      }
    }

    // If remainder starts with parenthesis or bracket, just add the remainder
    if (remainder.match(/^[\(\[]/)) {
      return `${tvShowName} ${remainder}`;
    }

    // Otherwise return the season title as-is
    return seasonTitle;
  }

  // Case 2: Season title contains the show name but doesn't start with it
  if (normalizedSeasonTitle.includes(normalizedShowName)) {
    return seasonTitle;
  }

  // Case 3: No redundancy, combine them
  return `${tvShowName} - ${seasonTitle}`;
}