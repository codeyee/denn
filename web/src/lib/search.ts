export const SEARCH_DEBOUNCE_MS = 500;
export const SEARCH_QUERY_MAX_LENGTH = 80;

export function normalizeSearchQuery(
  value: string,
  maxLength = SEARCH_QUERY_MAX_LENGTH,
) {
  return value.trim().slice(0, maxLength);
}

export function limitSearchInput(
  value: string,
  maxLength = SEARCH_QUERY_MAX_LENGTH,
) {
  return value.slice(0, maxLength);
}
