const DEFAULT_TITLE = "Untitled";
const SEASON_TITLE_SEPARATOR = ": ";
const PREFIX_SEPARATOR_PATTERN = /^[-–—:\s]+/;

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function stripPrefix(value: string, prefix: string): string {
  if (!normalizeText(value).startsWith(normalizeText(prefix))) return value;
  return value
    .slice(prefix.length)
    .replace(PREFIX_SEPARATOR_PATTERN, "")
    .trim();
}

export function formatSeasonLocalTitle(
  seasonTitle: string | null | undefined,
  seasonNumber?: number,
  tvShowName?: string | null,
): string {
  const seasonLabel =
    seasonNumber === undefined ? "" : `Season ${seasonNumber}`;
  let specificTitle = seasonTitle?.trim() ?? "";

  if (tvShowName && normalizeText(specificTitle).startsWith(normalizeText(tvShowName))) {
    specificTitle = stripPrefix(specificTitle, tvShowName);
  }

  if (!seasonLabel) return specificTitle || DEFAULT_TITLE;
  if (!specificTitle) return seasonLabel;

  if (normalizeText(specificTitle).startsWith(normalizeText(seasonLabel))) {
    specificTitle = stripPrefix(specificTitle, seasonLabel);
  }

  if (
    !specificTitle ||
    (tvShowName && normalizeText(specificTitle) === normalizeText(tvShowName))
  ) {
    return seasonLabel;
  }

  return specificTitle;
}

export function formatSeasonTitle(
  tvShowName: string | null | undefined,
  seasonTitle: string | null | undefined,
  seasonNumber?: number,
): string {
  const localTitle = formatSeasonLocalTitle(
    seasonTitle,
    seasonNumber,
    tvShowName,
  );
  const showName = tvShowName?.trim();
  return showName
    ? `${showName}${SEASON_TITLE_SEPARATOR}${localTitle}`
    : localTitle;
}
