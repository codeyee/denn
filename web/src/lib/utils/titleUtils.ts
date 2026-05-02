const SEPARATOR_PATTERN = /^[:\-\s]+$/;
const PREFIX_SEPARATOR_PATTERN = /^[:\-\s]/;
const BRACKET_PATTERN = /^[([]/;
const DEFAULT_TITLE = "Untitled";

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function extractRemainder(seasonTitle: string, showName: string): string {
  return seasonTitle.substring(showName.length).trim();
}

export function formatSeasonTitle(
  tvShowName: string | null | undefined,
  seasonTitle: string | null | undefined
): string {
  if (!seasonTitle) return tvShowName || DEFAULT_TITLE;
  if (!tvShowName) return seasonTitle;

  const normalizedShowName = normalizeText(tvShowName);
  const normalizedSeasonTitle = normalizeText(seasonTitle);

  if (normalizedSeasonTitle.startsWith(normalizedShowName)) {
    const remainder = extractRemainder(seasonTitle, tvShowName);

    if (!remainder || remainder.match(SEPARATOR_PATTERN)) {
      return seasonTitle;
    }

    if (remainder.match(PREFIX_SEPARATOR_PATTERN)) {
      const cleanRemainder = remainder.replace(PREFIX_SEPARATOR_PATTERN, "").trim();
      if (cleanRemainder) {
        return `${tvShowName} ${cleanRemainder}`;
      }
    }

    if (remainder.match(BRACKET_PATTERN)) {
      return `${tvShowName} ${remainder}`;
    }

    return seasonTitle;
  }

  if (normalizedSeasonTitle.includes(normalizedShowName)) {
    return seasonTitle;
  }

  return `${tvShowName} - ${seasonTitle}`;
}
